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

    const driver = await (this.prisma as any).driver.findFirst({
        where: { phone: { in: searchPhones } },
        include: { vehicle: true }
    });

    if (!driver) {
      this.logger.warn(`⚠️ Motorista não encontrado para phones: ${searchPhones.join(', ')}`);
      return { status: 'driver_not_found' };
    }

    const replyPhone = driver.phone;
    this.logger.log(`👤 Motorista: ${driver.name}`);

    if (messageContent.type === 'LOCATION') {
         const loc = messageContent.value;
         await (this.prisma as any).driver.update({
            where: { id: driver.id },
            data: { lastLocation: { lat: loc.latitude, lng: loc.longitude }, lastSeenAt: new Date() }
         });
         await this.whatsapp.sendText(replyPhone, "📍 Localização atualizada.");
         return { status: 'location_updated' };
    }

    let aiResult;
    if (messageContent.type === 'TEXT') aiResult = await this.aiService.interpretText(messageContent.value);
    else if (messageContent.type === 'AUDIO') aiResult = await this.aiService.interpretAudio(messageContent.value);
    else if (messageContent.type === 'IMAGE') aiResult = await this.aiService.interpretImage(messageContent.value, messageContent.caption);

    if (!aiResult || aiResult.action === 'UNKNOWN') {
        try {
            await (this.prisma as any).aiLearning.create({
                data: {
                    phrase: typeof messageContent.value === 'string' ? messageContent.value : 'Mídia',
                    intent: 'REVISAR',
                    isActive: false
                }
            });
        } catch (e) {}
        await this.whatsapp.sendText(replyPhone, "🤔 Não entendi. Tente falar de forma mais direta.");
        return { status: 'ignored', reason: 'ai_unknown' };
    }

    if (aiResult.action === 'OUTRO') {
        try {
            await (this.prisma as any).aiLearning.create({
                data: {
                    phrase: typeof messageContent.value === 'string' ? messageContent.value : 'Mídia',
                    intent: 'OUTRO_CHECK',
                    isActive: false
                }
            });
        } catch (e) {}
        await this.whatsapp.sendText(replyPhone, "🤖 Sou o ZapRoute.\nFale sobre entregas, ocorrências ou digite *'Ajuda'*.");
        return { status: 'outro_replied' };
    }

    // Execução na Rota
    const today = new Date(); today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const activeRoute = await (this.prisma as any).route.findFirst({
        where: { driverId: driver.id, date: { gte: today, lt: tomorrow } },
        orderBy: { createdAt: 'desc' },
        include: { deliveries: { include: { customer: true } } }
    });

    if (!activeRoute) {
        await this.whatsapp.sendText(replyPhone, "🚫 Nenhuma rota encontrada para hoje.");
        return { status: 'error', message: 'Sem rota.' };
    }

    const { action, identifier, reason } = aiResult;

    // SAUDAÇÃO
    if (action === 'SAUDACAO') {
        const hour = new Date().getHours() - 3; 
        let greeting = 'Bom dia';
        if (hour >= 12 && hour < 18) greeting = 'Boa tarde';
        if (hour >= 18 || hour < 5) greeting = 'Boa noite';
        const firstName = driver.name.split(' ')[0];

        let msg = '';
        if (activeRoute.status === 'PLANNED') {
            msg = `${greeting}, ${firstName}! 🚚\nSua rota tem *${activeRoute.deliveries.length} entregas*.\nQuando estiver pronto, fale *"Iniciar"* ou *"Saindo"*.`;
        } else if (activeRoute.status === 'ACTIVE') {
            const pendentes = activeRoute.deliveries.filter((d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT').length;
            msg = `${greeting}, ${firstName}! Seguindo firme?\nAinda faltam *${pendentes} entregas*.`;
        } else {
            msg = `${greeting}, ${firstName}! Sua rota já foi finalizada. Bom descanso!`;
        }
        await this.whatsapp.sendText(replyPhone, msg);
        return { status: 'greeting_sent' };
    }

    if (action === 'AJUDA') {
        const helpMsg = `🤖 *Ajuda ZapRoute*\n\n1️⃣ *Rota:* 'Iniciar', 'Pausar'\n2️⃣ *Entregas:* 'Entreguei a nota X', Foto\n3️⃣ *Problemas:* 'Cliente fechado', 'Quebrei'\n4️⃣ *Consultas:* 'Resumo', 'Me leva lá', 'Contato'`;
        await this.whatsapp.sendText(replyPhone, helpMsg);
        return { status: 'help_sent' };
    }

    if (action === 'RESUMO') {
        const total = activeRoute.deliveries.length;
        const done = activeRoute.deliveries.filter((d: any) => d.status === 'DELIVERED').length;
        const pending = activeRoute.deliveries.filter((d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT');
        const next = pending[0];
        
        let msg = `📊 *Resumo*\n✅ Feitas: *${done}/${total}*\n📦 Pendentes: *${pending.length}*\n`;
        if (next) msg += `\n👉 *Próxima:* ${next.customer.tradeName}\n📄 NF: ${next.invoiceNumber}`;
        else msg += `\n🎉 *Tudo finalizado!*`;
        
        await this.whatsapp.sendText(replyPhone, msg);
        return { status: 'summary_sent' };
    }

    if (action === 'PAUSA') {
        await this.whatsapp.sendText(replyPhone, `🍽️ *Pausa Registrada.*\nBom descanso! Avise quando voltar.`);
        return { status: 'paused' };
    }

    if (action === 'RETOMADA') {
        await this.whatsapp.sendText(replyPhone, `▶️ *Retomando!*\nBora para a próxima entrega.`);
        return { status: 'resumed' };
    }

    if (action === 'ATRASO') {
        const delayInfo = reason || 'Motivo não informado';
        try {
            await (this.prisma as any).occurrence.create({
                data: {
                    type: 'DELAY',
                    description: delayInfo,
                    driverId: driver.id,
                    routeId: activeRoute.id,
                    tenantId: driver.tenantId
                }
            });
            await this.whatsapp.sendText(replyPhone, `⚠️ *Ocorrência Registrada.*\nMotivo: ${delayInfo}.`);
        } catch (e) { this.logger.error(e); }
        return { status: 'delay_recorded' };
    }

    if (action === 'NAVEGACAO' || action === 'CONTATO' || action === 'DETALHES') {
        let targetDelivery;
        if (identifier) {
            targetDelivery = activeRoute.deliveries.find((d: any) => d.invoiceNumber.includes(identifier) || d.customer.tradeName.toLowerCase().includes(identifier.toLowerCase()));
        } else {
            targetDelivery = activeRoute.deliveries.find((d: any) => d.status === 'IN_TRANSIT') || activeRoute.deliveries.find((d: any) => d.status === 'PENDING');
        }

        if (!targetDelivery) {
            await this.whatsapp.sendText(replyPhone, "❓ Não encontrei a entrega solicitada.");
            return { status: 'not_found' };
        }

        if (action === 'NAVEGACAO') {
             const addr = targetDelivery.customer.addressDetails?.street || targetDelivery.customer.location?.address;
             if (addr) {
                 const encoded = encodeURIComponent(addr);
                 await this.whatsapp.sendText(replyPhone, `🗺️ *Navegação*\n🚙 Waze: https://waze.com/ul?q=${encoded}\n🌎 Maps: https://www.google.com/maps/dir/?api=1&destination=LAT,LNG{encoded}`);
             } else {
                 await this.whatsapp.sendText(replyPhone, "📍 Cliente sem endereço cadastrado.");
             }
        } else if (action === 'CONTATO') {
             const phone = targetDelivery.customer.phone ? targetDelivery.customer.phone.replace(/\D/g, '') : null;
             const link = phone ? `https://wa.me/55${phone}` : 'N/A';
             await this.whatsapp.sendText(replyPhone, `📞 *Contato*\nCliente: ${targetDelivery.customer.tradeName}\nTel: ${targetDelivery.customer.phone}\n💬: ${link}`);
        } else if (action === 'DETALHES') {
             const val = targetDelivery.value ? `R$ ${targetDelivery.value.toFixed(2)}` : 'R$ 0,00';
             await this.whatsapp.sendText(replyPhone, `📋 *Detalhes*\nNF: ${targetDelivery.invoiceNumber}\nProd: ${targetDelivery.product || 'Diversos'}\nValor: ${val}`);
        }
        return { status: 'info_sent' };
    }
    
    if (action === 'DESFAZER') {
        const lastDone = activeRoute.deliveries
            .filter((d: any) => d.status === 'DELIVERED' || d.status === 'FAILED')
            .sort((a: any, b: any) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0];

        if (lastDone) {
            await (this.prisma as any).delivery.update({
                where: { id: lastDone.id },
                data: { status: 'PENDING', failureReason: null, proofOfDelivery: null }
            });
            await this.whatsapp.sendText(replyPhone, `↩️ *Desfeito!* A entrega da NF *${lastDone.invoiceNumber}* voltou para PENDENTE.`);
        } else {
            await this.whatsapp.sendText(replyPhone, "❌ Nada para desfazer.");
        }
        return { status: 'undone' };
    }

    if (action === 'INICIO') {
        await (this.prisma as any).route.update({
            where: { id: activeRoute.id },
            data: { status: 'ACTIVE', startTime: new Date().toLocaleTimeString('pt-BR') }
        });
        await (this.prisma as any).delivery.updateMany({
            where: { routeId: activeRoute.id, status: 'PENDING' },
            data: { status: 'IN_TRANSIT' }
        });
        await this.whatsapp.sendText(replyPhone, `🚀 *Rota Iniciada!*\nBom trabalho, ${driver.name.split(' ')[0]}!`);
        return { status: 'started' };
    }

    // --- BAIXA DIRETA (SEM BOTÃO) ---
    if (action === 'ENTREGA' || messageContent.type === 'IMAGE') {
        let targetDelivery = null;
        
        if (aiResult?.identifier) {
             targetDelivery = activeRoute.deliveries.find((d: any) => d.invoiceNumber.includes(aiResult.identifier));
        }
        
        if (!targetDelivery) {
            targetDelivery = activeRoute.deliveries.find((d: any) => d.status === 'IN_TRANSIT' || d.status === 'PENDING');
        }

        if (targetDelivery) {
            const proofUrl = messageContent.type === 'IMAGE' ? messageContent.value : undefined;
            
            await (this.prisma as any).delivery.update({
                where: { id: targetDelivery.id },
                data: { 
                    status: 'DELIVERED', 
                    proofOfDelivery: proofUrl,
                    updatedAt: new Date() 
                }
            });

            await this.whatsapp.sendText(replyPhone, `✅ *Entrega Confirmada*\nNF: ${targetDelivery.invoiceNumber}\nCliente: ${targetDelivery.customer.tradeName}`);
        } else {
            await this.whatsapp.sendText(replyPhone, "🤔 Não achei entrega pendente para baixar.");
        }
        return { status: 'delivered' };
    }

    if (action === 'FALHA' && identifier) {
        const delivery = activeRoute.deliveries.find((d: any) => d.invoiceNumber.includes(identifier));
        if (delivery) {
            await (this.prisma as any).delivery.update({
                where: { id: delivery.id },
                data: { status: 'FAILED', failureReason: reason || 'Informado via WhatsApp' }
            });
            await this.whatsapp.sendText(replyPhone, `⚠️ *Ocorrência Registrada* na NF ${delivery.invoiceNumber}.`);
        }
    }

    return { status: 'processed' };
  }
}