import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { WhatsappService, ProviderConfig } from '../whatsapp/whatsapp.service';

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);

    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
        private whatsapp: WhatsappService
    ) { }

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

    private getWhatsappConfig(tenant: any): ProviderConfig {
        const providerType = tenant.config?.whatsappProvider || 'ZAPI';

        if (providerType === 'SENDPULSE') {
            return {
                type: 'SENDPULSE',
                sendpulseClientId: process.env.SENDPULSE_ID,
                sendpulseClientSecret: process.env.SENDPULSE_SECRET,
                sendpulseBotId: tenant.config?.whatsappProvider?.sendpulseBotId || process.env.SENDPULSE_BOT_ID
            };
        }

        // Default: Z-API
        return {
            type: 'ZAPI',
            zapiInstanceId: tenant.config?.whatsappProvider?.zapiInstanceId || process.env.ZAPI_INSTANCE_ID,
            zapiToken: tenant.config?.whatsappProvider?.zapiToken || process.env.ZAPI_TOKEN,
            zapiClientToken: tenant.config?.whatsappProvider?.zapiClientToken || process.env.ZAPI_CLIENT_TOKEN
        };
    }

    // ===========================================================================
    // BLOCO 2: PROCESSAMENTO DO WEBHOOK
    // ===========================================================================

    async processSendPulseMessage(event: any) {
        this.logger.log(`🔄 Processando evento SendPulse: ${JSON.stringify(event)}`);

        // 1. Validação básica
        if (event.service !== 'whatsapp' || event.title !== 'incoming_message') {
            this.logger.warn(`⚠️ Evento ignorado: Tipo inválido (Service: ${event.service}, Title: ${event.title})`);
            return { status: 'ignored_event_type' };
        }

        // 2. Extração de dados
        const rawPhone = event.contact?.phone;
        const channelData = event.info?.message?.channel_data;
        const msgData = channelData?.message;
        const messageType = msgData?.type;

        if (!rawPhone || !messageType) {
            this.logger.warn(`⚠️ Evento ignorado: Dados incompletos (Phone: ${rawPhone}, Type: ${messageType})`);
            return { status: 'invalid_payload' };
        }

        // 3. Normalização
        const normalizedPayload: any = { phone: rawPhone };

        switch (messageType) {
            case 'text':
                normalizedPayload.text = { message: msgData.text.body };
                break;
            case 'image':
                normalizedPayload.image = {
                    imageUrl: msgData.image.url,
                    caption: msgData.image.caption || 'FOTO_ENVIADA'
                };
                break;
            case 'audio':
            case 'voice':
                // SendPulse usa 'audio' ou 'voice'
                normalizedPayload.audio = {
                    audioUrl: msgData.audio?.url || msgData.voice?.url
                };
                break;
            case 'location':
                const loc = msgData.location;
                normalizedPayload.location = {
                    latitude: loc.latitude,
                    longitude: loc.longitude
                };
                break;
            default:
                this.logger.warn(`⚠️ Tipo de mensagem não suportado: ${messageType}`);
                return { status: 'type_not_supported' };
        }

        this.logger.log(`📨 [SendPulse] Recebido de ${rawPhone} | Tipo: ${messageType}`);

        // 4. Reutiliza a lógica central
        return this.processMessage(normalizedPayload);
    }

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
            include: { vehicle: true, tenant: true }
        });

        if (!driver) {
            this.logger.warn(`⚠️ Motorista não encontrado.`);
            return { status: 'driver_not_found' };
        }

        this.logger.log(`✅ Motorista identificado: ${driver.name} (ID: ${driver.id})`);

        // CORREÇÃO: Responder para o número que enviou a mensagem (Webhook), 
        // e não o do cadastro, para evitar erro de "Contact not active" por divergência de 9º dígito.
        const replyPhone = rawPhone.replace(/\D/g, '');

        const send = async (msg: string) => {
            const config = this.getWhatsappConfig(driver.tenant);
            this.logger.log(`🤖 Respondendo via ${config.type} para ${replyPhone}`);
            await this.whatsapp.sendText(replyPhone, msg, config);
        };

        // ===========================================================================
        // BLOCO 4: INTERPRETAÇÃO (INTELIGÊNCIA ARTIFICIAL)
        // ===========================================================================

        // Se for localização, atualiza e encerra
        if (messageContent.type === 'LOCATION') {
            const loc = messageContent.value;
            // await (this.prisma as any).driver.update(...) // Descomente se tiver campo location
            await send("📍 Localização recebida.");
            return { status: 'location_updated' };
        }

        // Chama o Gemini para entender o texto/áudio/imagem
        const text = messageContent.type === 'TEXT' ? messageContent.value : (messageContent.caption || undefined);
        const imageUrl = messageContent.type === 'IMAGE' ? messageContent.value : undefined;
        const audioUrl = messageContent.type === 'AUDIO' ? messageContent.value : undefined;

        const aiResult = await this.aiService.processMessage(driver.id, text, imageUrl, audioUrl);

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

            await send("🤔 Não entendi. Tente comandos como 'Iniciar rota', 'Entreguei a nota X' ou 'Ajuda'.");
            return { status: 'learning_queued' };
        }

        if (aiResult.action === 'AJUDA') {
            const helpMsg = `🤖 *Comandos ZapRoute*\n\n▶️ Iniciar\n⏸️ Pausa\n📦 Entreguei a nota X\n❌ Falha na nota X\n📊 Resumo`;
            await send(helpMsg);
            return { status: 'help_sent' };
        }

        // ===========================================================================
        // BLOCO 5: LÓGICA DE ROTA E AÇÕES
        // ===========================================================================

        // Busca a rota de HOJE para este motorista
        // 4. Tratamento de Rotas Inteligente
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

        // PASSO 1: Buscar TODAS as rotas abertas (PLANNED ou ACTIVE)
        const activeRoutes = await (this.prisma as any).route.findMany({
            where: {
                driverId: driver.id,
                date: { gte: today, lt: tomorrow },
                status: { in: ['PLANNED', 'ACTIVE'] }
            },
            orderBy: { createdAt: 'asc' },
            include: {
                deliveries: {
                    include: {
                        customer: { include: { seller: true } }
                    }
                }
            }
        });

        // PASSO 2: Se não achou nada aberto, verificamos se o dia já foi ENCERRADO
        if (activeRoutes.length === 0) {
            const completedRoute = await (this.prisma as any).route.findFirst({
                where: {
                    driverId: driver.id,
                    date: { gte: today, lt: tomorrow },
                    status: 'COMPLETED'
                }
            });

            const greeting = this.getGreeting();

            if (completedRoute) {
                // Caso A: O motorista trabalhou e já acabou tudo
                await send(`🏁 ${greeting}, ${driver.name}!\n\nVerifiquei aqui e *todas as suas rotas de hoje já foram finalizadas*.\n\nBom descanso! Se houver alguma mudança, eu te aviso.`);
            } else {
                // Caso B: Realmente não tinha nada para hoje
                if (aiResult.action === 'SAUDACAO' || aiResult.action === 'OUTRO' || aiResult.action === 'RESUMO') {
                    await send(`${greeting}, ${driver.name}! 👋\nNo momento, não encontrei nenhuma rota agendada para você hoje.`);
                } else {
                    await send(`🚫 ${greeting}, ${driver.name}. Você não tem rota ativa para realizar essa ação.`);
                }
            }
            // Retorna status especial para encerrar a execução aqui
            return { status: 'no_active_route' };
        }

        // Se chegou aqui, existe pelo menos uma rota válida
        const { action, identifier, reason } = aiResult;

        // --- SELEÇÃO DE ROTA ATIVA ---
        // Se tiver uma rota ACTIVE, ela é a prioritária. Se não, pegamos a primeira PLANNED.
        // Mas para o comando INICIO, precisamos de lógica especial se houver múltiplas PLANNED.
        let targetRoute = activeRoutes.find((r: any) => r.status === 'ACTIVE') || activeRoutes[0];

        // --- BLOCO: SAIR DA ROTA (NOVO) ---
        if (action === 'SAIR_ROTA') {
            const activeRoute = activeRoutes.find((r: any) => r.status === 'ACTIVE');

            if (!activeRoute) {
                await send("⚠️ Você não tem nenhuma rota iniciada para sair.");
                return { status: 'no_active_route_to_exit' };
            }

            // Verifica se já teve entregas realizadas (DELIVERED ou FAILED)
            const processedCount = activeRoute.deliveries.filter((d: any) => d.status === 'DELIVERED' || d.status === 'FAILED').length;

            if (processedCount > 0) {
                await send(`🚫 *Ação Bloqueada*\n\nVocê já realizou entregas nesta rota. Não é possível sair/cancelar agora para evitar erros no sistema.\n\nSe precisar parar, use o comando *'Pausa'* ou contate o supervisor.`);
                return { status: 'exit_route_blocked' };
            }

            // Se não processou nada, permite sair (voltar para PLANNED)
            await (this.prisma as any).route.update({
                where: { id: activeRoute.id },
                data: { status: 'PLANNED', startTime: null }
            });

            // Retorna entregas para PENDING se estavam IN_TRANSIT
            await (this.prisma as any).delivery.updateMany({
                where: { routeId: activeRoute.id, status: 'IN_TRANSIT' },
                data: { status: 'PENDING' }
            });

            await send(`✅ *Rota Cancelada/Reiniciada*\n\nA rota *${activeRoute.name}* voltou para o status de planejamento.\nQuando estiver pronto, digite *'Iniciar'* novamente.`);
            return { status: 'route_exited' };
        }

        // --- BLOCO: INICIAR ROTA (COM SUPORTE A MÚLTIPLAS) ---
        if (action === 'INICIO') {
            // 1. Se já tem uma rota rodando, avisa e mantém nela
            const runningRoute = activeRoutes.find((r: any) => r.status === 'ACTIVE');
            if (runningRoute) {
                await send(`⚠️ A rota *${runningRoute.name}* já está em andamento.\n\nTermine ela antes de iniciar outra!`);
                return { status: 'already_started' };
            }

            // 2. Se tem múltiplas rotas PLANNED e o motorista não especificou qual
            const plannedRoutes = activeRoutes.filter((r: any) => r.status === 'PLANNED');

            if (plannedRoutes.length > 1) {
                // Tenta achar pelo nome se o motorista falou (identifier)
                if (identifier) {
                    const match = plannedRoutes.find((r: any) => r.name.toLowerCase().includes(identifier.toLowerCase()));
                    if (match) {
                        targetRoute = match; // Achou a rota específica!
                    } else {
                        // Falou nome mas não achou
                        const names = plannedRoutes.map((r: any) => `• ${r.name}`).join('\n');
                        await send(`🤔 Não encontrei a rota "${identifier}".\n\nSuas rotas disponíveis:\n${names}\n\nTente: "Iniciar rota [Nome]"`);
                        return { status: 'route_not_found_by_name' };
                    }
                } else {
                    // Não falou nome, lista as opções
                    const names = plannedRoutes.map((r: any) => `• ${r.name}`).join('\n');
                    await send(`📋 Você tem *${plannedRoutes.length} rotas* disponíveis:\n\n${names}\n\nPor favor, diga qual quer iniciar.\nEx: *"Iniciar rota ${plannedRoutes[0].name}"*`);
                    return { status: 'multiple_routes_ambiguity' };
                }
            }

            // 3. Inicia a rota alvo (targetRoute)
            await (this.prisma as any).route.update({
                where: { id: targetRoute.id },
                data: { status: 'ACTIVE', startTime: new Date().toLocaleTimeString('pt-BR') }
            });

            // Atualiza status das entregas
            await (this.prisma as any).delivery.updateMany({
                where: { routeId: targetRoute.id, status: 'PENDING' },
                data: { status: 'IN_TRANSIT' }
            });

            await send(`🚀 *Rota Iniciada: ${targetRoute.name}*\n\nBom trabalho, ${driver.name}!\n📦 Total de entregas: *${targetRoute.deliveries.length}*.`);
            return { status: 'route_started' };
        }

        // Para os outros comandos, usamos a targetRoute definida acima (Active ou a primeira Planned)
        const activeRoute = targetRoute;

        // --- ADICIONE ESTE BLOCO AQUI ---
        if (action === 'SAUDACAO') {
            const greeting = this.getGreeting();
            const pending = activeRoute.deliveries.filter((d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT').length;

            // Template Personalizado
            const config = driver.tenant?.config as any || {};
            const templates = config.whatsappTemplates || {};

            if (templates.greeting) {
                let msg = templates.greeting;
                msg = msg.replace('{motorista}', driver.name.split(' ')[0]);
                await send(msg);
            } else {
                // Padrão
                await send(`${greeting}, ${driver.name}! 🚚\n\nSua rota *${activeRoute.name}* está ativa.\n📦 Entregas pendentes: *${pending}*.\n\nDigite *'Iniciar'* para começar ou *'Resumo'* para detalhes.`);
            }
            return { status: 'greeting_sent' };
        }

        // --- COMANDOS INFORMATIVOS ---

        if (action === 'RESUMO') {
            const total = activeRoute.deliveries.length;
            const done = activeRoute.deliveries.filter((d: any) => d.status === 'DELIVERED').length;
            const pending = activeRoute.deliveries.filter((d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT');

            let msg = `📊 *Resumo*\n✅ Feitas: *${done}/${total}*\n📦 Pendentes: *${pending.length}*`;
            if (pending.length > 0) {
                msg += `\n👉 Próxima: ${pending[0].customer.tradeName}`;
            }

            await send(msg);
            return { status: 'summary_sent' };
        }

        if (action === 'PAUSA') {
            await send(`🍽️ *Pausa Registrada.*\nBom descanso!`);
            return { status: 'paused' };
        }

        if (action === 'RETOMADA') {
            await send(`▶️ *Retomando!*\nBora para a próxima.`);
            return { status: 'resumed' };
        }

        if (action === 'ATRASO') {
            await send(`⚠️ *Atraso reportado.*\nMotivo: ${reason || 'Não informado'}.`);
            return { status: 'delay_reported' };
        }

        if (action === 'NAVEGACAO') {
            // Tenta achar entrega específica ou a próxima pendente
            let target = identifier
                ? activeRoute.deliveries.find((d: any) => d.invoiceNumber.includes(identifier) || d.customer.tradeName.toLowerCase().includes(identifier.toLowerCase()))
                : activeRoute.deliveries.find((d: any) => d.status === 'IN_TRANSIT' || d.status === 'PENDING');

            if (!target) {
                await send("📍 Nenhuma entrega localizada para navegação.");
                return { status: 'no_target_nav' };
            }

            const address = target.customer.addressDetails?.street
                ? `${target.customer.addressDetails.street}, ${target.customer.addressDetails.number} - ${target.customer.addressDetails.city}`
                : target.customer.location?.address;

            if (!address) {
                await send(`📍 Endereço não cadastrado para ${target.customer.tradeName}.`);
                return { status: 'no_address' };
            }

            const encoded = encodeURIComponent(address);
            await send(`🗺️ *Navegar para ${target.customer.tradeName}*\n🚙 Waze: https://waze.com/ul?q=${encoded}\n🌎 Maps: http://maps.google.com/?q=${encoded}`);
            return { status: 'nav_sent' };
        }

        // --- COMANDOS OPERACIONAIS ---
        // (INICIO já foi tratado acima)

        if ((action === 'ENTREGA' || action === 'FALHA') && identifier) {
            // 1. Busca Inteligente (Prioriza Exata > Contém)
            let delivery = activeRoute.deliveries.find((d: any) =>
                d.invoiceNumber === identifier || d.customer.tradeName.toLowerCase() === identifier.toLowerCase()
            );

            // Se não achou exato, tenta parcial (fallback)
            if (!delivery) {
                delivery = activeRoute.deliveries.find((d: any) =>
                    d.invoiceNumber.includes(identifier) || d.customer.tradeName.toLowerCase().includes(identifier.toLowerCase())
                );
            }

            if (!delivery) {
                await send(`❌ Não encontrei a nota ou cliente *"${identifier}"*.`);
                return { status: 'not_found' };
            }

            // 2. Trava de Rota Não Iniciada
            if (activeRoute.status === 'PLANNED') {
                await send(`🚫 *Atenção:* Sua rota ainda não foi iniciada.\n\nPor favor, digite *'Iniciar'* antes de começar.`);
                return { status: 'route_not_started_block' };
            }

            // 3. Preparação dos Dados
            const newStatus = action === 'ENTREGA' ? 'DELIVERED' : 'FAILED';
            const failReason = action === 'FALHA' ? (reason || 'Via WhatsApp') : null;
            const proofUrl = messageContent.type === 'IMAGE' ? messageContent.value : undefined;

            // 4. ATUALIZAÇÃO ATÔMICA (A Correção Definitiva)
            // Tenta atualizar SOMENTE se o status atual permitir (Pendentes).
            // Isso impede duplicidade mesmo se o motorista clicar 10 vezes.
            const updateResult = await (this.prisma as any).delivery.updateMany({
                where: {
                    id: delivery.id,
                    status: { in: ['PENDING', 'IN_TRANSIT'] } // Só atualiza se não estiver finalizada
                },
                data: {
                    status: newStatus,
                    failureReason: failReason,
                    proofOfDelivery: proofUrl,
                    updatedAt: new Date()
                }
            });

            // 5. Verifica se atualizou de verdade
            if (updateResult.count === 0) {
                // Se count é 0, significa que a entrega JÁ ESTAVA finalizada no banco
                // Buscamos o status atual só para responder a mensagem correta
                const currentDelivery = await (this.prisma as any).delivery.findUnique({ where: { id: delivery.id } });
                const statusPt = currentDelivery?.status === 'DELIVERED' ? 'Entregue' : 'Com Ocorrência';

                await send(`⚠️ A nota *${delivery.invoiceNumber}* já consta como *${statusPt}*.\n\nSe baixou errado e quer corrigir, digite *'Desfazer'*.`);
                return { status: 'delivery_already_done_block' };
            }

            // 6. Lógica de Sucesso (Segue normal)
            const pendingCount = await (this.prisma as any).delivery.count({
                where: { routeId: activeRoute.id, status: { in: ['PENDING', 'IN_TRANSIT'] } }
            });

            if (pendingCount === 0) {
                await (this.prisma as any).route.update({
                    where: { id: activeRoute.id },
                    data: { status: 'COMPLETED', endTime: new Date().toLocaleTimeString('pt-BR') }
                });
                await send(`🎉 *Rota Finalizada!* Todas as entregas concluídas.`);
            } else {
                // Template Personalizado de Sucesso
                const config = driver.tenant?.config as any || {};
                const templates = config.whatsappTemplates || {};

                if (templates.success) {
                    let msg = templates.success;
                    msg = msg.replace('{motorista}', driver.name.split(' ')[0]);
                    msg = msg.replace('{cliente}', delivery.customer.tradeName);
                    msg = msg.replace('{nf}', delivery.invoiceNumber);
                    await send(msg);
                } else {
                    // Padrão
                    const emoji = action === 'ENTREGA' ? '✅' : '⚠️';
                    await send(`${emoji} *Registrado*\nNF: ${delivery.invoiceNumber}\nFaltam: ${pendingCount}.`);
                }
            }

            return { status: 'success', action: newStatus };
        }

        // --- BLOCO: WORKFLOW DETALHADO (CHEGADA / DESCARGA) ---
        if (['CHEGADA', 'INICIO_DESCARGA', 'FIM_DESCARGA'].includes(action)) {
            // 1. Busca Entrega Alvo
            let delivery = null;
            if (identifier) {
                delivery = activeRoute.deliveries.find((d: any) =>
                    d.invoiceNumber === identifier || d.customer.tradeName.toLowerCase().includes(identifier.toLowerCase())
                );
            } else {
                // Se não falou qual, assume a próxima pendente/em trânsito
                delivery = activeRoute.deliveries.find((d: any) => d.status === 'IN_TRANSIT' || d.status === 'PENDING');
            }

            if (!delivery) {
                await send(`⚠️ Não identifiquei qual entrega você está se referindo.\n\nDiga o nome do cliente ou número da nota.`);
                return { status: 'workflow_target_not_found' };
            }

            // 2. Define Campo a Atualizar
            const updateData: any = {};
            let msg = '';
            const now = new Date();

            if (action === 'CHEGADA') {
                updateData.arrivedAt = now;
                msg = `📍 *Chegada Registrada*\nCliente: ${delivery.customer.tradeName}\n\nPode iniciar a descarga quando estiver pronto.`;
            } else if (action === 'INICIO_DESCARGA') {
                updateData.unloadingStartedAt = now;
                msg = `📦 *Descarga Iniciada*\nCliente: ${delivery.customer.tradeName}\n\nAvise quando terminar.`;
            } else if (action === 'FIM_DESCARGA') {
                updateData.unloadingEndedAt = now;
                msg = `✅ *Descarga Finalizada*\nCliente: ${delivery.customer.tradeName}\n\nAgora confirme a entrega (foto/assinatura).`;
            }

            // 3. Atualiza no Banco
            await (this.prisma as any).delivery.update({
                where: { id: delivery.id },
                data: updateData
            });

            await send(msg);
            return { status: 'workflow_step_updated', step: action };
        }
        // ... (resto do código igual)
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

                await send(msg);
            } else {
                await send("De qual cliente você quer saber o vendedor?");
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
                await send(`👮‍♂️ *Contato da Base*\n\nFale com: ${supervisor.name}\n📞 Link: https://wa.me/55${supPhone}`);
            } else {
                await send("🏢 Não encontrei um número de supervisor cadastrado. Por favor, ligue na central.");
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
                await send(`📋 *Próximos Clientes:*\n\n${pendingList}`);
            } else {
                await send("🎉 A lista está vazia! Você já entregou tudo.");
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
            await send(`🚨 *SINISTRO REGISTRADO!* 🚨\n\nMantenha a calma. Já notifiquei a base sobre o ocorrido.\nSe houver vítimas, ligue 192/193 imediatamente.\n\nAguarde contato do supervisor.`);

            // 3. (Opcional) Poderíamos mandar msg pro Supervisor aqui também se tivesse a integração ativa

            return { status: 'sinister_alert' };
        }
        // --- NOVO BLOCO: FINALIZAR ROTA MANUALMENTE ---
        if (action === 'FINALIZAR') {
            const pending = activeRoute.deliveries.filter((d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT');

            if (pending.length > 0) {
                // Cenário A: Tem pendência. Avisa e bloqueia.
                await send(`⚠️ Você ainda tem *${pending.length} entregas pendentes*.\n\nSe não foram feitas, registre como FALHA antes de encerrar (Ex: "Cliente fechado nota X").`);
                return { status: 'finish_blocked' };
            } else {
                // Cenário B: Tudo feito, encerra.
                await (this.prisma as any).route.update({
                    where: { id: activeRoute.id },
                    data: { status: 'COMPLETED', endTime: new Date().toLocaleTimeString('pt-BR') }
                });
                await send(`✅ *Rota Encerrada!*\n\nMaravilha, ${driver.name}. Bom descanso!`);
                return { status: 'route_force_completed' };
            }
        }
        // --- BLOCO 5: SAUDAÇÃO E OUTROS ---
        if (action === 'OUTRO') {
            await send("🤖 Sou o assistente ZapRoute.\nFale sobre sua rota ou digite *'Ajuda'*.");
            return { status: 'outro_replied' };
        }

        return { status: 'processed_no_action' };
    }
}