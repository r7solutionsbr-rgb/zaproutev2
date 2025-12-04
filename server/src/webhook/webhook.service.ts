import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { NormalizationService } from './services/normalization.service';
import { DriverIdentificationService } from './services/driver-identification.service';
import { RouteCommandService } from './services/route-command.service';
import { MessageResponder } from './services/message-responder.service';
import { MessageType } from './dto/incoming-message.dto';

@Injectable()
export class WebhookService {
    private readonly logger = new Logger(WebhookService.name);

    constructor(
        private prisma: PrismaService,
        private aiService: AiService,
        private normalization: NormalizationService,
        private driverIdentification: DriverIdentificationService,
        private routeCommand: RouteCommandService,
        private responder: MessageResponder
    ) { }

    async processSendPulseMessage(event: any) {
        const message = this.normalization.normalize('SENDPULSE', event);
        if (!message) return { status: 'ignored_or_invalid' };
        return this.processMessage(message);
    }

    async processMessage(payload: any) {
        // 1. Normalização
        let message = payload.provider ? payload : this.normalization.normalize('ZAPI', payload);

        if (!message || !message.rawPhone) {
            return { status: 'ignored' };
        }

        this.logger.log(`📱 Webhook recebido de: ${message.rawPhone} | Tipo: ${message.type}`);

        // 2. Identificação do Motorista
        const driver = await this.driverIdentification.identifyDriver(message.rawPhone);

        if (!driver) {
            this.logger.warn(`⚠️ Motorista não encontrado.`);
            return { status: 'driver_not_found' };
        }

        this.logger.log(`✅ Motorista identificado: ${driver.name} (ID: ${driver.id})`);

        // Responder para o número que enviou a mensagem
        const replyPhone = message.rawPhone.replace(/\D/g, '');
        const send = (msg: string) => this.responder.send(replyPhone, msg, driver.tenant);

        // 3. Interpretação (IA)
        if (message.type === MessageType.LOCATION) {
            await send("📍 Localização recebida.");
            return { status: 'location_updated' };
        }

        const text = message.type === MessageType.TEXT ? message.payload.text : (message.payload.caption || undefined);
        const imageUrl = message.type === MessageType.IMAGE ? message.payload.url : undefined;
        const audioUrl = message.type === MessageType.AUDIO ? message.payload.url : undefined;

        const aiResult = await this.aiService.processMessage(driver.id, text, imageUrl, audioUrl);

        if (!aiResult || aiResult.action === 'UNKNOWN') {
            await send("🤔 Não entendi. Tente comandos como 'Iniciar rota', 'Entreguei a nota X' ou 'Ajuda'.");
            return { status: 'learning_queued' };
        }

        if (aiResult.action === 'AJUDA') {
            await send(`🤖 *Comandos ZapRoute*\n\n▶️ Iniciar\n⏸️ Pausa\n📦 Entreguei a nota X\n❌ Falha na nota X\n📊 Resumo`);
            return { status: 'help_sent' };
        }

        // 4. Lógica de Rota
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

        const activeRoutes = await (this.prisma as any).route.findMany({
            where: {
                driverId: driver.id,
                date: { gte: today, lt: tomorrow },
                status: { in: ['PLANNED', 'ACTIVE'] }
            },
            orderBy: { createdAt: 'asc' },
            include: { deliveries: { include: { customer: { include: { seller: true } } } } }
        });

        if (activeRoutes.length === 0) {
            const greeting = this.responder.getGreeting();
            await send(`${greeting}, ${driver.name}! 👋\nNo momento, não encontrei nenhuma rota agendada para você hoje.`);
            return { status: 'no_active_route' };
        }

        const { action, identifier, reason } = aiResult;
        let targetRoute = activeRoutes.find((r: any) => r.status === 'ACTIVE') || activeRoutes[0];

        // --- AÇÕES ---

        if (action === 'INICIO') {
            if (activeRoutes.some((r: any) => r.status === 'ACTIVE')) {
                await send(`⚠️ Já existe uma rota em andamento.`);
                return { status: 'already_started' };
            }
            await this.routeCommand.handleStartRoute(driver.id, targetRoute.id);
            await send(`🚀 *Rota Iniciada: ${targetRoute.name}*\nBom trabalho!`);
            return { status: 'route_started' };
        }

        if (action === 'SAIR_ROTA') {
            // Simplificação: só sai se não tiver entregas feitas (lógica movida ou mantida simples aqui)
            const active = activeRoutes.find((r: any) => r.status === 'ACTIVE');
            if (!active) {
                await send("⚠️ Nenhuma rota ativa.");
                return { status: 'no_active_route' };
            }
            await this.routeCommand.handleExitRoute(active.id);
            await send(`✅ Rota cancelada/reiniciada.`);
            return { status: 'route_exited' };
        }

        if (action === 'ENTREGA' || action === 'FALHA') {
            if (targetRoute.status !== 'ACTIVE') {
                await send(`🚫 Inicie a rota primeiro.`);
                return { status: 'route_not_started' };
            }

            // Busca entrega
            const delivery = targetRoute.deliveries.find((d: any) =>
                d.invoiceNumber === identifier || d.customer.tradeName.toLowerCase().includes(identifier?.toLowerCase() || '')
            );

            if (!delivery) {
                await send(`❌ Entrega não encontrada.`);
                return { status: 'not_found' };
            }

            const status = action === 'ENTREGA' ? 'DELIVERED' : 'FAILED';
            const success = await this.routeCommand.handleDeliveryUpdate(delivery.id, status, reason, imageUrl);

            if (!success) {
                await send(`⚠️ Entrega já finalizada.`);
                return { status: 'already_done' };
            }

            // Verifica se acabou a rota
            const pendingCount = await (this.prisma as any).delivery.count({
                where: { routeId: targetRoute.id, status: { in: ['PENDING', 'IN_TRANSIT'] } }
            });

            if (pendingCount === 0) {
                await this.routeCommand.handleFinishRoute(targetRoute.id);
                await send(`🎉 *Rota Finalizada!*`);
            } else {
                await send(`${action === 'ENTREGA' ? '✅' : '⚠️'} Registrado. Faltam: ${pendingCount}.`);
            }
            return { status: 'success', action: status };
        }

        if (['CHEGADA', 'INICIO_DESCARGA', 'FIM_DESCARGA'].includes(action)) {
            const delivery = targetRoute.deliveries.find((d: any) => d.status === 'IN_TRANSIT' || d.status === 'PENDING');
            if (delivery) {
                await this.routeCommand.handleWorkflowStep(delivery.id, action as any);
                await send(`✅ Status atualizado: ${action}`);
                return { status: 'workflow_updated' };
            }
            await send(`⚠️ Nenhuma entrega ativa.`);
            return { status: 'no_active_delivery' };
        }

        if (action === 'SAUDACAO') {
            const greeting = this.responder.getGreeting();
            await send(`${greeting}, ${driver.name}! 🚚\nRota: ${targetRoute.name}`);
            return { status: 'greeting_sent' };
        }

        if (action === 'RESUMO') {
            const total = targetRoute.deliveries.length;
            const done = targetRoute.deliveries.filter((d: any) => d.status === 'DELIVERED').length;
            await send(`📊 Resumo: ${done}/${total} entregues.`);
            return { status: 'summary_sent' };
        }

        if (action === 'LISTAR') {
            const pending = targetRoute.deliveries.filter((d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT');
            if (pending.length === 0) {
                await send(`🎉 Tudo entregue! Nenhuma pendência.`);
            } else {
                const list = pending.map((d: any, i: number) => `${i + 1}. ${d.customer.tradeName} (${d.invoiceNumber})`).join('\n');
                await send(`📋 *Pendentes (${pending.length}):*\n\n${list}`);
            }
            return { status: 'list_sent' };
        }

        if (action === 'PAUSA') {
            await send(`⏸️ Rota pausada. Bom descanso!`);
            // TODO: Registrar evento de pausa no banco se necessário
            return { status: 'paused' };
        }

        if (action === 'RETOMADA') {
            await send(`▶️ Rota retomada. Vamos lá!`);
            // TODO: Registrar evento de retomada no banco se necessário
            return { status: 'resumed' };
        }

        if (action === 'NAVEGACAO') {
            const nextDelivery = targetRoute.deliveries.find((d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT');
            if (!nextDelivery) {
                await send(`⚠️ Nenhuma entrega pendente para navegar.`);
                return { status: 'no_target' };
            }
            const address = `${nextDelivery.customer.address}, ${nextDelivery.customer.city} - ${nextDelivery.customer.state}`;
            const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
            await send(`🗺️ *Navegação para ${nextDelivery.customer.tradeName}*\n\n📍 Endereço: ${address}\n🔗 Link: ${mapsLink}`);
            await this.responder.sendLocation(replyPhone, nextDelivery.customer.latitude, nextDelivery.customer.longitude, nextDelivery.customer.tradeName, address, driver.tenant);
            return { status: 'navigation_sent' };
        }

        if (action === 'CONTATO') {
            const target = targetRoute.deliveries.find((d: any) =>
                d.invoiceNumber === identifier || d.customer.tradeName.toLowerCase().includes(identifier?.toLowerCase() || '')
            ) || targetRoute.deliveries.find((d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT');

            if (!target) {
                await send(`⚠️ Cliente não encontrado.`);
                return { status: 'not_found' };
            }
            await send(`📞 *Contato do Cliente*\n\n👤 ${target.customer.tradeName}\n📱 ${target.customer.phone}\n🗣️ Responsável: ${target.customer.contactName || 'Não informado'}`);
            // Enviar contato como vCard se possível (futuro)
            return { status: 'contact_sent' };
        }

        if (action === 'VENDEDOR') {
            const target = targetRoute.deliveries.find((d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT');
            if (!target || !target.customer.seller) {
                await send(`⚠️ Vendedor não identificado para o cliente atual.`);
                return { status: 'seller_not_found' };
            }
            await send(`💼 *Vendedor Responsável*\n\n👤 ${target.customer.seller.name}\n📱 ${target.customer.seller.phone || 'Sem telefone'}`);
            return { status: 'seller_sent' };
        }

        if (action === 'SUPERVISOR') {
            // Pegar do tenant config ou env
            const config = driver.tenant.config as any;
            const supervisorPhone = config?.supervisorPhone || process.env.SUPERVISOR_PHONE || 'Não configurado';
            await send(`🚨 *Contato da Base/Supervisor*\n\n📱 ${supervisorPhone}\n\nLigue em caso de emergência.`);
            return { status: 'supervisor_sent' };
        }

        if (action === 'SINISTRO') {
            await send(`⚠️ *SINISTRO REGISTRADO*\n\nA base foi notificada. Se houver feridos, ligue 190.\nPor favor, envie fotos e áudio explicando o ocorrido.`);
            // TODO: Disparar alerta crítico para o painel
            return { status: 'incident_reported' };
        }

        if (action === 'ATRASO') {
            await send(`⏱️ Atraso registrado: "${reason || 'Não informado'}". A base foi avisada.`);
            // TODO: Atualizar ETA da rota
            return { status: 'delay_reported' };
        }

        if (action === 'DETALHES') {
            const target = targetRoute.deliveries.find((d: any) =>
                d.invoiceNumber === identifier || d.customer.tradeName.toLowerCase().includes(identifier?.toLowerCase() || '')
            ) || targetRoute.deliveries.find((d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT');

            if (!target) {
                await send(`⚠️ Entrega não encontrada.`);
                return { status: 'not_found' };
            }

            const items = target.items ? (typeof target.items === 'string' ? JSON.parse(target.items) : target.items) : [];
            const itemsList = items.map((i: any) => `- ${i.quantity}x ${i.description}`).join('\n');

            await send(`📄 *Detalhes da Nota ${target.invoiceNumber}*\n\n👤 ${target.customer.tradeName}\n💰 Valor: R$ ${target.value}\n\n📦 *Itens:*\n${itemsList || 'Sem itens listados'}`);
            return { status: 'details_sent' };
        }

        if (action === 'FINALIZAR') {
            await this.routeCommand.handleFinishRoute(targetRoute.id);
            await send(`🏁 Rota finalizada manualmente. Bom descanso!`);
            return { status: 'route_finished_manual' };
        }

        if (action === 'DESFAZER') {
            // Lógica simplificada: Reverter última entrega entregue/falhada para pendente
            // Idealmente, o RouteCommandService teria um método específico
            await send(`⚠️ Funcionalidade de desfazer ainda em desenvolvimento. Por favor, contate a base para corrigir.`);
            return { status: 'undo_not_implemented' };
        }

        if (action === 'OUTRO' || action === 'UNKNOWN') {
            // Se for conversa fiada ou dúvida, usa o Chat do Leônidas
            const chatResponse = await this.aiService.chatWithLeonidas(text || '', `Motorista: ${driver.name}. Rota: ${targetRoute.name}`);
            await send(chatResponse);
            return { status: 'chat_response' };
        }

        await send("Comando recebido.");
        return { status: 'processed' };
    }
}