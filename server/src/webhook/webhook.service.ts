import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private whatsapp: WhatsappService
  ) {}

  private formatToDbPattern(ddd: string, number: string): string | null {
      if (number.length === 9) return `+55 (${ddd}) ${number.slice(0,5)}-${number.slice(5)}`;
      if (number.length === 8) return `+55 (${ddd}) ${number.slice(0,4)}-${number.slice(4)}`;
      return null;
  }

  async processMessage(payload: any) {
    let rawPhone = '';
    let messageContent: { type: 'TEXT' | 'AUDIO' | 'IMAGE' | 'LOCATION', value: any, caption?: string } | null = null;

    if (payload.phone) {
        rawPhone = payload.phone;
        if (payload.text?.message) messageContent = { type: 'TEXT', value: payload.text.message };
        else if (payload.audio?.audioUrl) messageContent = { type: 'AUDIO', value: payload.audio.audioUrl };
        else if (payload.image?.imageUrl) messageContent = { type: 'IMAGE', value: payload.image.imageUrl, caption: payload.image.caption || '' };
        else if (payload.location) messageContent = { type: 'LOCATION', value: payload.location };
    } else if (payload.object === 'whatsapp_business_account') {
        const msg = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
        if (msg) {
            rawPhone = msg.from;
            if (msg.type === 'text') messageContent = { type: 'TEXT', value: msg.text.body };
        }
    }

    if (!rawPhone || !messageContent) return { status: 'ignored' };

    this.logger.log(`📱 Webhook recebido de: ${rawPhone} | Tipo: ${messageContent.type}`);

    // Identificar Motorista
    let clean = rawPhone.replace(/\D/g, '');
    if (clean.startsWith('55') && clean.length > 11) clean = clean.slice(2);
    const ddd = clean.slice(0, 2);
    const rest = clean.slice(2);
    
    const searchPhones: string[] = [];
    const p1 = this.formatToDbPattern(ddd, rest); if(p1) searchPhones.push(p1);
    if (rest.length === 8) { const p2 = this.formatToDbPattern(ddd, '9'+rest); if(p2) searchPhones.push(p2); }
    else if (rest.length === 9 && rest.startsWith('9')) { const p3 = this.formatToDbPattern(ddd, rest.slice(1)); if(p3) searchPhones.push(p3); }

    this.logger.log(`🔍 Phones a buscar: ${searchPhones.join(' | ')}`);

    const driver = await (this.prisma as any).driver.findFirst({
        where: { phone: { in: searchPhones } },
        include: { vehicle: true }
    });

    if (!driver) {
      this.logger.warn(`⚠️ Motorista não encontrado para phones: ${searchPhones.join(', ')}`);
      return { status: 'driver_not_found' };
    }

    this.logger.log(`✅ Motorista encontrado: ${driver.id} | ${driver.name}`);

    const replyPhone = driver.phone;

    this.logger.log(`👤 Motorista: ${driver.name} | Tipo: ${messageContent.type}`);

    // Localização (Atualiza GPS independente de rota)
    if (messageContent.type === 'LOCATION') {
         const loc = messageContent.value;
         await (this.prisma as any).driver.update({
            where: { id: driver.id },
            data: { lastLocation: { lat: loc.latitude, lng: loc.longitude }, lastSeenAt: new Date() }
         });
         await this.whatsapp.sendText(replyPhone, "📍 Localização recebida e atualizada.");
         return { status: 'location_updated' };
    }

    // IA - Interpretar Intenção
    let aiResult;
    if (messageContent.type === 'TEXT') aiResult = await this.aiService.interpretText(messageContent.value);
    else if (messageContent.type === 'AUDIO') aiResult = await this.aiService.interpretAudio(messageContent.value);
    else if (messageContent.type === 'IMAGE') aiResult = await this.aiService.interpretImage(messageContent.value, messageContent.caption);

    if (!aiResult || aiResult.action === 'UNKNOWN') {
        // 🔥 NOVO: Salva na memória para você ensinar depois
        try {
            await (this.prisma as any).aiLearning.create({
                data: {
                    phrase: typeof messageContent.value === 'string' ? messageContent.value : 'Arquivo de mídia',
                    intent: 'REVISAR', // Marca para o admin ver
                    isActive: false
                }
            });
        } catch (e) {
            this.logger.error('Falha ao salvar aprendizado', e);
        }

        await this.whatsapp.sendText(replyPhone, "🤔 Não entendi. Encaminhei sua mensagem para a supervisão.");
        return { status: 'learning_queued' };
    }

    // AJUDA
    if (aiResult.action === 'AJUDA') {
        const helpMsg = `🤖 *Ajuda ZapRoute*\n\n1️⃣ *Rota:* 'Iniciar', 'Pausar', 'Voltei'\n2️⃣ *Entregas:* 'Entreguei a nota X', Foto do comprovante\n3️⃣ *Problemas:* 'Cliente fechado nota X', 'Vou atrasar'\n4️⃣ *Status:* 'Resumo'`;
        await this.whatsapp.sendText(replyPhone, helpMsg);
        return { status: 'help_sent' };
    }

    // Execução de Rota
    // Buscar rotas de HOJE
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    this.logger.log(`🔍 Buscando rota para motorista ${driver.id}`);

    const activeRoute = await (this.prisma as any).route.findFirst({
        where: { 
          driverId: driver.id, 
          date: { gte: today, lt: tomorrow }
        },
        orderBy: { createdAt: 'desc' },
        include: { deliveries: { include: { customer: true } } }
    });

    if (activeRoute) {
      this.logger.log(`📍 Rota: ${activeRoute.name} | Data: ${activeRoute.date.toISOString()} | Status: ${activeRoute.status}`);
    }

    if (!activeRoute) {
        await this.whatsapp.sendText(replyPhone, "🚫 Nenhuma rota encontrada para hoje.");
        return { status: 'error', message: 'Sem rota.' };
    }

    const { action, identifier, reason } = aiResult;

    // --- COMANDOS DE STATUS E FLUXO ---

    // 1. RESUMO
    if (action === 'RESUMO') {
        const total = activeRoute.deliveries.length;
        const done = activeRoute.deliveries.filter((d: any) => d.status === 'DELIVERED').length;
        const pending = activeRoute.deliveries.filter((d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT');
        
        const next = pending[0];
        
        let msg = `📊 *Resumo da Rota*\n\n✅ Feitas: *${done}/${total}*\n📦 Pendentes: *${pending.length}*\n`;
        if (next) {
            msg += `\n👉 *Próxima:* ${next.customer.tradeName}\n📄 NF: ${next.invoiceNumber}\n📍 ${next.customer.addressDetails?.street || 'Endereço não cadastrado'}`;
        } else {
            msg += `\n🎉 *Tudo finalizado!*`;
        }
        
        await this.whatsapp.sendText(replyPhone, msg);
        return { status: 'summary_sent' };
    }

    // 2. PAUSA
    if (action === 'PAUSA') {
        await this.whatsapp.sendText(replyPhone, `🍽️ *Pausa Registrada.*\nBom descanso, ${driver.name.split(' ')[0]}! Avise quando voltar.`);
        return { status: 'paused' };
    }

    // 3. RETOMADA
    if (action === 'RETOMADA') {
        await this.whatsapp.sendText(replyPhone, `▶️ *Retomando!*\nBora para a próxima entrega.`);
        return { status: 'resumed' };
    }

    // 4. ATRASO
    if (action === 'ATRASO') {
        const delayInfo = reason || 'Motivo não informado';
        await this.whatsapp.sendText(replyPhone, `⚠️ *Alerta de Atraso Recebido.*\nMotivo: ${delayInfo}. Registrado no painel.`);
        return { status: 'delay_reported' };
    }

    // --- NOVOS COMANDOS DE SUPORTE À ROTA ---

    // 5. NAVEGAÇÃO (Manda link do Maps/Waze)
    if (action === 'NAVEGACAO') {
        let targetDelivery;
        
        if (identifier) {
            targetDelivery = activeRoute.deliveries.find((d: any) => 
                d.invoiceNumber.toLowerCase().includes(identifier.toLowerCase()) ||
                d.customer.tradeName.toLowerCase().includes(identifier.toLowerCase())
            );
        } else {
            targetDelivery = activeRoute.deliveries.find((d: any) => d.status === 'IN_TRANSIT') 
                          || activeRoute.deliveries.find((d: any) => d.status === 'PENDING');
        }

        if (!targetDelivery) {
            await this.whatsapp.sendText(replyPhone, "📍 Não encontrei nenhuma entrega pendente para navegar.");
            return { status: 'no_target_for_nav' };
        }

        const address = targetDelivery.customer.addressDetails?.street 
            ? `${targetDelivery.customer.addressDetails.street}, ${targetDelivery.customer.addressDetails.number || ''} - ${targetDelivery.customer.addressDetails.city || ''}`
            : targetDelivery.customer.location?.address;

        if (!address) {
             await this.whatsapp.sendText(replyPhone, `📍 O cliente *${targetDelivery.customer.tradeName}* não tem endereço cadastrado.`);
             return { status: 'no_address' };
        }

        const encodedAddr = encodeURIComponent(address);
        const wazeLink = `https://waze.com/ul?q=${encodedAddr}`;
        const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddr}`;

        await this.whatsapp.sendText(replyPhone, `🗺️ *Navegação para ${targetDelivery.customer.tradeName}*\n\nEndereço: ${address}\n\n🚙 *Waze:* ${wazeLink}\n\n🌎 *Maps:* ${mapsLink}`);
        return { status: 'navigation_sent' };
    }

    // 6. CONTATO (Manda telefone do cliente)
    if (action === 'CONTATO') {
        let targetDelivery;
        if (identifier) {
            targetDelivery = activeRoute.deliveries.find((d: any) => d.invoiceNumber.includes(identifier) || d.customer.tradeName.toLowerCase().includes(identifier.toLowerCase()));
        } else {
            targetDelivery = activeRoute.deliveries.find((d: any) => d.status === 'IN_TRANSIT') || activeRoute.deliveries.find((d: any) => d.status === 'PENDING');
        }

        if (targetDelivery && targetDelivery.customer.phone) {
            const phoneClean = targetDelivery.customer.phone.replace(/\D/g, '');
            const phoneLink = `https://wa.me/55${phoneClean}`;
            
            await this.whatsapp.sendText(replyPhone, `📞 *Contato do Cliente*\n\nEmpresa: ${targetDelivery.customer.tradeName}\nFone: ${targetDelivery.customer.phone}\n\n💬 WhatsApp: ${phoneLink}`);
        } else {
            await this.whatsapp.sendText(replyPhone, "📴 Este cliente não tem telefone cadastrado no sistema.");
        }
        return { status: 'contact_sent' };
    }

    // 7. DESFAZER (Reverte a última ação)
    if (action === 'DESFAZER') {
        const lastDone = activeRoute.deliveries
            .filter((d: any) => d.status === 'DELIVERED' || d.status === 'FAILED')
            .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

        if (!lastDone) {
            await this.whatsapp.sendText(replyPhone, "❌ Não há nada para desfazer. Nenhuma entrega foi finalizada recentemente.");
            return { status: 'nothing_to_undo' };
        }

        await (this.prisma as any).delivery.update({
            where: { id: lastDone.id },
            data: { status: 'PENDING', failureReason: null, proofOfDelivery: null }
        });

        await this.whatsapp.sendText(replyPhone, `↩️ *Feito!* A entrega da NF *${lastDone.invoiceNumber}* voltou para PENDENTE. Pode corrigir.`);
        return { status: 'action_undone' };
    }
    // 8. DETALHES (Manda dados da nota)
    if (action === 'DETALHES') {
        let targetDelivery;
        
        // Tenta achar a entrega específica
        if (identifier) {
            targetDelivery = activeRoute.deliveries.find((d: any) => 
                d.invoiceNumber.toLowerCase().includes(identifier.toLowerCase()) ||
                d.customer.tradeName.toLowerCase().includes(identifier.toLowerCase())
            );
        } 
        
        // Se não falou qual, assume a próxima pendente (inteligência de contexto)
        if (!targetDelivery) {
            targetDelivery = activeRoute.deliveries.find((d: any) => d.status === 'IN_TRANSIT') 
                          || activeRoute.deliveries.find((d: any) => d.status === 'PENDING');
        }

        if (!targetDelivery) {
            await this.whatsapp.sendText(replyPhone, "❓ Não entendi de qual entrega você quer detalhes.");
            return { status: 'details_no_target' };
        }

        // Monta a ficha completa
        const vendedor = targetDelivery.salesperson || 'Não informado';
        const produtos = targetDelivery.product || 'Diversos';
        const valor = targetDelivery.value 
            ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(targetDelivery.value) 
            : 'R$ 0,00';
        const nf = targetDelivery.invoiceNumber;
        const cliente = targetDelivery.customer.tradeName;

        const msg = `📋 *Detalhes da Nota*\n\n🏢 Cliente: *${cliente}*\n📄 NF: *${nf}*\n\n👤 Vendedor: *${vendedor}*\n📦 Produtos: *${produtos}*\n💰 Valor: *${valor}*`;

        await this.whatsapp.sendText(replyPhone, msg);
        return { status: 'details_sent' };
    }
    // --- COMANDOS DE OPERAÇÃO ---

    if (action === 'INICIO') {
        await (this.prisma as any).route.update({
            where: { id: activeRoute.id },
            data: { status: 'ACTIVE', startTime: new Date().toLocaleTimeString('pt-BR') }
        });
        await (this.prisma as any).delivery.updateMany({
            where: { routeId: activeRoute.id, status: 'PENDING' },
            data: { status: 'IN_TRANSIT' }
        });
        await this.whatsapp.sendText(replyPhone, `🚀 *Rota Iniciada!*\n\nFala, ${driver.name}! Bom trabalho.\n📦 Total: *${activeRoute.deliveries.length}* entregas.`);
        return { status: 'route_started' };
    }

    if ((action === 'ENTREGA' || action === 'FALHA') && identifier) {
        const delivery = activeRoute.deliveries.find((d: any) => 
            d.invoiceNumber.toLowerCase().includes(identifier.toLowerCase()) ||
            d.customer.tradeName.toLowerCase().includes(identifier.toLowerCase()) ||
            d.customer.cnpj.includes(identifier)
        );

        if (!delivery) {
            await this.whatsapp.sendText(replyPhone, `❌ Não encontrei a entrega *"${identifier}"*.`);
            return { status: 'not_found' };
        }

        const newStatus = action === 'ENTREGA' ? 'DELIVERED' : 'FAILED';
        const failReason = action === 'FALHA' ? (reason || 'Via WhatsApp') : null;
        const proofUrl = messageContent.type === 'IMAGE' ? messageContent.value : undefined;

        await (this.prisma as any).delivery.update({
            where: { id: delivery.id },
            data: { status: newStatus, failureReason: failReason, proofOfDelivery: proofUrl, updatedAt: new Date() }
        });

        const pendingCount = await (this.prisma as any).delivery.count({
            where: { routeId: activeRoute.id, status: { in: ['PENDING', 'IN_TRANSIT'] } }
        });

        if (pendingCount === 0) {
            await (this.prisma as any).route.update({
                where: { id: activeRoute.id },
                data: { status: 'COMPLETED', endTime: new Date().toLocaleTimeString('pt-BR') }
            });
            await this.whatsapp.sendText(replyPhone, `🎉 *Rota Finalizada!*\nTodas as entregas concluídas. Bom descanso!`);
        } else {
            const emoji = action === 'ENTREGA' ? '✅' : '⚠️';
            await this.whatsapp.sendText(replyPhone, `${emoji} *${action === 'ENTREGA' ? 'Sucesso' : 'Ocorrência'}*\n📄 NF: *${delivery.invoiceNumber}*\n🏢 Cliente: *${delivery.customer.tradeName}*\n\nFaltam: *${pendingCount}*.`);
        }
        
        return { status: 'success', action: newStatus };
    }

    if ((action === 'ENTREGA' || action === 'FALHA') && !identifier) {
         if (messageContent.type === 'IMAGE') {
             await this.whatsapp.sendText(replyPhone, "📷 Recebi a foto, mas não consegui ler o número. Por favor, digite o número da nota.");
         } else {
             await this.whatsapp.sendText(replyPhone, `🤔 Entendi que é uma ${action}, mas não sei qual nota. Fale o número ou o nome do cliente.`);
         }
         return { status: 'missing_identifier' };
    }

    return { status: 'processed_no_action' };
  }
}