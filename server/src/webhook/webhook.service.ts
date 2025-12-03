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

        await send("Comando recebido.");
        return { status: 'processed' };
    }
}