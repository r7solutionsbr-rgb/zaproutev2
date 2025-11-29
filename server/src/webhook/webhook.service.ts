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

  // ===========================================================================
  // BLOCO 1: UTILITÁRIOS
  // ===========================================================================

  /**
   * Recria a formatação visual (máscara) que geralmente é salva via Frontend/Excel.
   * Ex: Transforma '85999998888' em '+55 (85) 99999-8888'
   */
  private formatPhoneVisual(ddd: string, number: string): string {
    const part1 = number.length === 9 ? number.slice(0, 5) : number.slice(0, 4);
    const part2 = number.length === 9 ? number.slice(5) : number.slice(4);
    return `+55 (${ddd}) ${part1}-${part2}`;
  }
  private getGreeting(): string {
    const hour = parseInt(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  }

  // ===========================================================================
  // BLOCO 2: PROCESSAMENTO DO WEBHOOK
  // ===========================================================================

  async processMessage(payload: any) {
    let rawPhone = '';
    let messageContent: { type: 'TEXT' | 'AUDIO' | 'IMAGE' | 'LOCATION', value: any, caption?: string } | null = null;

    // 2.1 - Extração dos dados (Suporta Z-API e WhatsApp Cloud API)
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

    // ===========================================================================
    // BLOCO 3: IDENTIFICAÇÃO DO MOTORISTA (CORREÇÃO CRÍTICA)
    // ===========================================================================

    // 1. Limpeza total (apenas números)
    let cleanPhone = rawPhone.replace(/\D/g, '');
    
    // 2. Remove código do país (55) se existir, para isolar DDD+Número
    // Isso é vital porque às vezes o banco salva sem o 55.
    if (cleanPhone.startsWith('55') && cleanPhone.length > 10) {
        cleanPhone = cleanPhone.slice(2);
    }

    const ddd = cleanPhone.slice(0, 2);
    const number = cleanPhone.slice(2);

    // 3. Gera lista de possibilidades para buscar no banco
    const possibleNumbers = new Set<string>();

    // Variação A: Apenas dígitos (Ex: 85999998888 e 5585999998888)
    possibleNumbers.add(cleanPhone);       
    possibleNumbers.add(`55${cleanPhone}`); 

    // Variação B: Formatado visualmente (Ex: +55 (85) 99999-8888)
    possibleNumbers.add(this.formatPhoneVisual(ddd, number));

    // Variação C: Nono Dígito (Tenta adicionar ou remover o 9 para garantir match em bases antigas/novas)
    if (number.length === 8) {
        // Se veio 8 dígitos, tenta versão com 9
        const with9 = '9' + number;
        possibleNumbers.add(with9);
        possibleNumbers.add(`55${ddd}${with9}`);
        possibleNumbers.add(this.formatPhoneVisual(ddd, with9));
    } else if (number.length === 9 && number.startsWith('9')) {
        // Se veio 9 dígitos, tenta versão sem 9
        const without9 = number.slice(1);
        possibleNumbers.add(without9);
        possibleNumbers.add(`55${ddd}${without9}`);
        possibleNumbers.add(this.formatPhoneVisual(ddd, without9));
    }

    const searchList = Array.from(possibleNumbers);
    this.logger.log(`🔍 Buscando motorista por: ${searchList.join(' | ')}`);

    // 4. Consulta ao Banco
    const driver = await (this.prisma as any).driver.findFirst({
        where: { phone: { in: searchList } },
        include: { vehicle: true }
    });

    if (!driver) {
      this.logger.warn(`⚠️ Motorista não encontrado.`);
      return { status: 'driver_not_found' };
    }

    this.logger.log(`✅ Motorista identificado: ${driver.name} (ID: ${driver.id})`);
    const replyPhone = driver.phone; // Responde no número exato que está no cadastro

    // ===========================================================================
    // BLOCO 4: INTERPRETAÇÃO (INTELIGÊNCIA ARTIFICIAL)
    // ===========================================================================

    // Se for localização, atualiza e encerra
    if (messageContent.type === 'LOCATION') {
         const loc = messageContent.value;
         // await (this.prisma as any).driver.update(...) // Descomente se tiver campo location
         await this.whatsapp.sendText(replyPhone, "📍 Localização recebida.");
         return { status: 'location_updated' };
    }

    // Chama o Gemini para entender o texto/áudio/imagem
    let aiResult;
    if (messageContent.type === 'TEXT') aiResult = await this.aiService.interpretText(messageContent.value);
    else if (messageContent.type === 'AUDIO') aiResult = await this.aiService.interpretAudio(messageContent.value);
    else if (messageContent.type === 'IMAGE') aiResult = await this.aiService.interpretImage(messageContent.value, messageContent.caption);

    // Se a IA não entendeu ou falhou
    if (!aiResult || aiResult.action === 'UNKNOWN') {
        try {
            // Salva para aprendizado (curadoria humana depois)
            await (this.prisma as any).aiLearning.create({
                data: {
                    phrase: typeof messageContent.value === 'string' ? messageContent.value : 'Arquivo de mídia',
                    intent: 'REVISAR',
                    isActive: false
                }
            });
        } catch (e) { this.logger.error('Erro ao salvar learning', e); }

        await this.whatsapp.sendText(replyPhone, "🤔 Não entendi. Tente comandos como 'Iniciar rota', 'Entreguei a nota X' ou 'Ajuda'.");
        return { status: 'learning_queued' };
    }

    if (aiResult.action === 'AJUDA') {
        const helpMsg = `🤖 *Comandos ZapRoute*\n\n▶️ Iniciar\n⏸️ Pausa\n📦 Entreguei a nota X\n❌ Falha na nota X\n📊 Resumo`;
        await this.whatsapp.sendText(replyPhone, helpMsg);
        return { status: 'help_sent' };
    }

    // ===========================================================================
    // BLOCO 5: LÓGICA DE ROTA E AÇÕES
    // ===========================================================================

    // Busca a rota de HOJE para este motorista
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

    const activeRoute = await (this.prisma as any).route.findFirst({
        where: { driverId: driver.id, date: { gte: today, lt: tomorrow } },
        orderBy: { createdAt: 'desc' },
        include: { 
            deliveries: { 
                include: { 
                    customer: { 
                        include: { seller: true } // <--- ADICIONE ISTO: Carrega dados do vendedor
                    } 
                } 
            } 
        }
    });

    if (!activeRoute) {
        // --- ALTERAÇÃO AQUI ---
        const greeting = this.getGreeting();
        
        // Se for só um "Bom dia" ou conversa, responde educadamente
        if (aiResult.action === 'SAUDACAO' || aiResult.action === 'OUTRO') {
            await this.whatsapp.sendText(replyPhone, `${greeting}, ${driver.name}! 👋\nNo momento, não encontrei nenhuma rota vinculada a você para hoje.`);
        } 
        // Se ele tentou um comando (Ex: "Iniciar"), bloqueia e avisa
        else {
            await this.whatsapp.sendText(replyPhone, `🚫 ${greeting}, ${driver.name}. Você não tem rota ativa hoje para realizar essa ação.`);
        }
        return { status: 'no_route' };
    }

    const { action, identifier, reason } = aiResult;

    // --- COMANDOS INFORMATIVOS ---

    if (action === 'RESUMO') {
        const total = activeRoute.deliveries.length;
        const done = activeRoute.deliveries.filter((d: any) => d.status === 'DELIVERED').length;
        const pending = activeRoute.deliveries.filter((d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT');
        
        let msg = `📊 *Resumo*\n✅ Feitas: *${done}/${total}*\n📦 Pendentes: *${pending.length}*`;
        if (pending.length > 0) {
            msg += `\n👉 Próxima: ${pending[0].customer.tradeName}`;
        }
        
        await this.whatsapp.sendText(replyPhone, msg);
        return { status: 'summary_sent' };
    }

    if (action === 'PAUSA') {
        await this.whatsapp.sendText(replyPhone, `🍽️ *Pausa Registrada.*\nBom descanso!`);
        return { status: 'paused' };
    }

    if (action === 'RETOMADA') {
        await this.whatsapp.sendText(replyPhone, `▶️ *Retomando!*\nBora para a próxima.`);
        return { status: 'resumed' };
    }

    if (action === 'ATRASO') {
        await this.whatsapp.sendText(replyPhone, `⚠️ *Atraso reportado.*\nMotivo: ${reason || 'Não informado'}.`);
        return { status: 'delay_reported' };
    }

    if (action === 'NAVEGACAO') {
        // Tenta achar entrega específica ou a próxima pendente
        let target = identifier 
            ? activeRoute.deliveries.find((d: any) => d.invoiceNumber.includes(identifier) || d.customer.tradeName.toLowerCase().includes(identifier.toLowerCase()))
            : activeRoute.deliveries.find((d: any) => d.status === 'IN_TRANSIT' || d.status === 'PENDING');

        if (!target) {
            await this.whatsapp.sendText(replyPhone, "📍 Nenhuma entrega localizada para navegação.");
            return { status: 'no_target_nav' };
        }

        const address = target.customer.addressDetails?.street 
            ? `${target.customer.addressDetails.street}, ${target.customer.addressDetails.number} - ${target.customer.addressDetails.city}`
            : target.customer.location?.address;

        if (!address) {
             await this.whatsapp.sendText(replyPhone, `📍 Endereço não cadastrado para ${target.customer.tradeName}.`);
             return { status: 'no_address' };
        }

        const encoded = encodeURIComponent(address);
        await this.whatsapp.sendText(replyPhone, `🗺️ *Navegar para ${target.customer.tradeName}*\n🚙 Waze: https://waze.com/ul?q=${encoded}\n🌎 Maps: http://maps.google.com/?q=${encoded}`);
        return { status: 'nav_sent' };
    }

    // --- COMANDOS OPERACIONAIS ---

    if (action === 'INICIO') {
        await (this.prisma as any).route.update({
            where: { id: activeRoute.id },
            data: { status: 'ACTIVE', startTime: new Date().toLocaleTimeString('pt-BR') }
        });
        await (this.prisma as any).delivery.updateMany({
            where: { routeId: activeRoute.id, status: 'PENDING' },
            data: { status: 'IN_TRANSIT' }
        });
        await this.whatsapp.sendText(replyPhone, `🚀 *Rota Iniciada!*\n📦 ${activeRoute.deliveries.length} entregas.`);
        return { status: 'route_started' };
    }

    if ((action === 'ENTREGA' || action === 'FALHA') && identifier) {
        const delivery = activeRoute.deliveries.find((d: any) => 
            d.invoiceNumber.toLowerCase().includes(identifier.toLowerCase()) ||
            d.customer.tradeName.toLowerCase().includes(identifier.toLowerCase()) ||
            d.customer.cnpj.includes(identifier)
        );

        if (!delivery) {
            await this.whatsapp.sendText(replyPhone, `❌ Não encontrei a nota ou cliente *"${identifier}"*.`);
            return { status: 'not_found' };
        }

        const newStatus = action === 'ENTREGA' ? 'DELIVERED' : 'FAILED';
        const failReason = action === 'FALHA' ? (reason || 'Via WhatsApp') : null;
        const proofUrl = messageContent.type === 'IMAGE' ? messageContent.value : undefined;

        await (this.prisma as any).delivery.update({
            where: { id: delivery.id },
            data: { status: newStatus, failureReason: failReason, proofOfDelivery: proofUrl, updatedAt: new Date() }
        });

        // Contagem regressiva
        const pendingCount = await (this.prisma as any).delivery.count({
            where: { routeId: activeRoute.id, status: { in: ['PENDING', 'IN_TRANSIT'] } }
        });

        if (pendingCount === 0) {
            await (this.prisma as any).route.update({
                where: { id: activeRoute.id },
                data: { status: 'COMPLETED', endTime: new Date().toLocaleTimeString('pt-BR') }
            });
            await this.whatsapp.sendText(replyPhone, `🎉 *Rota Finalizada!* Todas as entregas concluídas.`);
        } else {
            const emoji = action === 'ENTREGA' ? '✅' : '⚠️';
            await this.whatsapp.sendText(replyPhone, `${emoji} *Registrado*\nNF: ${delivery.invoiceNumber}\nFaltam: ${pendingCount}.`);
        }
        
        return { status: 'success', action: newStatus };
    }

    // Se tentou entregar mas não disse qual nota
    if ((action === 'ENTREGA' || action === 'FALHA') && !identifier) {
         if (messageContent.type === 'IMAGE') {
             await this.whatsapp.sendText(replyPhone, "📷 Recebi a foto. Qual é o número da nota para eu baixar?");
         } else {
             await this.whatsapp.sendText(replyPhone, `🤔 Entendi que é uma ${action}, mas qual é o número da nota?`);
         }
         return { status: 'missing_identifier' };
    }
if (action === 'VENDEDOR') {
        let target = identifier 
            ? activeRoute.deliveries.find((d: any) => d.invoiceNumber.includes(identifier) || d.customer.tradeName.toLowerCase().includes(identifier.toLowerCase()))
            : activeRoute.deliveries.find((d: any) => d.status === 'IN_TRANSIT' || d.status === 'PENDING');

        if (target) {
            const cliente = target.customer;
            const vendedorNome = cliente.seller?.name || cliente.salesperson || 'Não informado';
            
            let msg = `👤 *Vendedor Responsável*\n\nCliente: ${cliente.tradeName}\nVendedor: *${vendedorNome}*`;
            
            // Se tivermos o telefone no cadastro novo, enviamos o link!
            if (cliente.seller?.phone) {
                const phoneClean = cliente.seller.phone.replace(/\D/g, '');
                msg += `\n📞 WhatsApp: https://wa.me/55${phoneClean}`;
            } else {
                msg += `\n(Sem telefone cadastrado no sistema)`;
            }

            await this.whatsapp.sendText(replyPhone, msg);
        } else {
            await this.whatsapp.sendText(replyPhone, "De qual cliente você quer saber o vendedor?");
        }
        return { status: 'salesperson_info' };
    }

    // --- BLOCO 2: SUPERVISOR ---
    if (action === 'SUPERVISOR') {
        // Busca um admin/dispatcher da mesma empresa que tenha telefone
        const supervisor = await (this.prisma as any).user.findFirst({
            where: { 
                tenantId: driver.tenantId,
                role: { in: ['ADMIN', 'DISPATCHER'] },
                phone: { not: null }
            }
        });

        if (supervisor && supervisor.phone) {
            const supPhone = supervisor.phone.replace(/\D/g, '');
            await this.whatsapp.sendText(replyPhone, `👮‍♂️ *Contato da Base*\n\nFale com: ${supervisor.name}\n📞 Link: https://wa.me/55${supPhone}`);
        } else {
            await this.whatsapp.sendText(replyPhone, "🏢 Não encontrei um número de supervisor cadastrado. Por favor, ligue na central.");
        }
        return { status: 'supervisor_sent' };
    }

    // --- BLOCO 3: LISTAR CLIENTES ---
    if (action === 'LISTAR') {
        const pendingList = activeRoute.deliveries
            .filter((d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT')
            .map((d: any, index: number) => `${index + 1}. ${d.customer.tradeName} (NF ${d.invoiceNumber})`)
            .join('\n');

        if (pendingList) {
            await this.whatsapp.sendText(replyPhone, `📋 *Próximos Clientes:*\n\n${pendingList}`);
        } else {
            await this.whatsapp.sendText(replyPhone, "🎉 A lista está vazia! Você já entregou tudo.");
        }
        return { status: 'list_sent' };
    }

    // --- BLOCO 4: SINISTRO (Grave) ---
    if (action === 'SINISTRO') {
        // 1. Registra no banco como Ocorrência
        await (this.prisma as any).occurrence.create({
            data: {
                type: 'SINISTER', // Tipo crítico
                description: reason || 'Sinistro reportado via WhatsApp (Acidente/Quebra/Roubo)',
                driverId: driver.id,
                routeId: activeRoute.id,
                tenantId: driver.tenantId
            }
        });

        // 2. Avisa o motorista
        await this.whatsapp.sendText(replyPhone, `🚨 *SINISTRO REGISTRADO!* 🚨\n\nMantenha a calma. Já notifiquei a base sobre o ocorrido.\nSe houver vítimas, ligue 192/193 imediatamente.\n\nAguarde contato do supervisor.`);

        // 3. (Opcional) Poderíamos mandar msg pro Supervisor aqui também se tivesse a integração ativa
        
        return { status: 'sinister_alert' };
    }
    // --- BLOCO 5: SAUDAÇÃO E OUTROS ---
    if (action === 'OUTRO') {
        await this.whatsapp.sendText(replyPhone, "🤖 Sou o assistente ZapRoute.\nFale sobre sua rota ou digite *'Ajuda'*.");
        return { status: 'outro_replied' };
    }

    return { status: 'processed_no_action' };
  }
}