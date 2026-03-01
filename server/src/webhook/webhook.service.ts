import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { NormalizationService } from './services/normalization.service';
import { BotIdentityService } from './services/bot-identity.service';
import { RouteCommandService } from './services/route-command.service';
import { MessageResponder } from './services/message-responder.service';
import { MessageType } from './dto/incoming-message.dto';
import { JourneyService } from '../journey/journey.service';
import { BotRole } from './types/bot-role';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AiService,
    private normalization: NormalizationService,
    private identity: BotIdentityService,
    private routeCommand: RouteCommandService,
    private responder: MessageResponder,
    private journeyService: JourneyService,
  ) {}

  private getAllowedActions(role: BotRole): string[] {
    const base = ['AJUDA', 'SAUDACAO'];
    switch (role) {
      case 'DRIVER':
        return [
          ...base,
          'INICIO',
          'ENTREGA',
          'FALHA',
          'PAUSA',
          'RETOMADA',
          'RESUMO',
          'OUTRO',
          'ATRASO',
          'NAVEGACAO',
          'CONTATO',
          'DESFAZER',
          'DETALHES',
          'FINALIZAR',
          'VENDEDOR',
          'SUPERVISOR',
          'LISTAR',
          'SINISTRO',
          'SAIR_ROTA',
          'CHEGADA',
          'INICIO_DESCARGA',
          'FIM_DESCARGA',
          'INICIO_JORNADA',
          'INICIO_ALMOCO',
          'FIM_ALMOCO',
          'INICIO_DESCANSO',
          'FIM_DESCANSO',
          'INICIO_ESPERA',
          'FIM_ESPERA',
          'FIM_JORNADA',
          'STATUS',
        ];
      case 'THIRD_PARTY_DRIVER':
        return [
          ...base,
          'INICIO',
          'ENTREGA',
          'FALHA',
          'CHEGADA',
          'INICIO_DESCARGA',
          'FIM_DESCARGA',
          'RESUMO',
          'LISTAR',
          'ATRASO',
          'SINISTRO',
        ];
      case 'SUPERVISOR':
      case 'TRANSPORTER':
        return [...base, 'RESUMO', 'LISTAR', 'STATUS', 'DETALHES'];
      case 'SELLER':
        return [...base, 'STATUS', 'DETALHES', 'LISTAR'];
      case 'CUSTOMER':
        return [...base, 'STATUS', 'DETALHES'];
      default:
        return base;
    }
  }

  private getHelpMessage(role: BotRole): string {
    switch (role) {
      case 'DRIVER':
        return (
          `🤖 *Comandos ZapRoute (Motorista)*\n\n` +
          `▶️ Iniciar rota\n⏸️ Pausa / Retomada\n` +
          `📦 Entreguei a nota X\n❌ Falha na nota X\n` +
          `📍 Cheguei / Início descarga / Fim descarga\n` +
          `📊 Resumo / Lista\n🧭 Navegação\n` +
          `☎️ Contato cliente / Vendedor / Supervisor\n` +
          `🚨 Sinistro / Atraso\n📝 Detalhes nota\n🏁 Finalizar rota`
        );
      case 'THIRD_PARTY_DRIVER':
        return (
          `🤖 *Comandos ZapRoute (Motorista Terceiro)*\n\n` +
          `▶️ Iniciar rota\n📦 Entreguei a nota X\n❌ Falha na nota X\n` +
          `📍 Cheguei / Início descarga / Fim descarga\n` +
          `📊 Resumo / Lista\n🚨 Sinistro / Atraso`
        );
      case 'SUPERVISOR':
        return (
          `🤖 *Comandos ZapRoute (Supervisor)*\n\n` +
          `📊 Resumo geral\n📋 Lista pendentes\n` +
          `🔎 Status da nota X\n📝 Detalhes da nota X`
        );
      case 'TRANSPORTER':
        return (
          `🤖 *Comandos ZapRoute (Transportador)*\n\n` +
          `📊 Resumo geral\n📋 Lista pendentes\n` +
          `🔎 Status da nota X\n📝 Detalhes da nota X`
        );
      case 'SELLER':
        return (
          `🤖 *Comandos ZapRoute (Vendedor)*\n\n` +
          `🔎 Status da nota X\n📝 Detalhes da nota X\n📋 Lista pendentes`
        );
      case 'CUSTOMER':
        return (
          `🤖 *Comandos ZapRoute (Cliente)*\n\n` +
          `🔎 Status da nota X\n📝 Detalhes da nota X`
        );
      default:
        return `🤖 *Comandos ZapRoute*\n\nPeça ajuda com "Ajuda".`;
    }
  }

  private async handleNonDriverAction(
    role: BotRole,
    actor: any,
    tenant: any,
    aiResult: any,
    send: (msg: string) => Promise<void>,
  ) {
    const { action, identifier } = aiResult || {};
    const allowed = this.getAllowedActions(role);

    if (!allowed.includes(action)) {
      await send('🤔 Comando não permitido para este perfil. Digite "Ajuda".');
      return { status: 'action_not_allowed' };
    }

    if (action === 'AJUDA') {
      await send(this.getHelpMessage(role));
      return { status: 'help_sent' };
    }

    if (action === 'SAUDACAO') {
      const greeting = this.responder.getGreeting();
      await send(`${greeting}! Como posso ajudar?`);
      return { status: 'greeting_sent' };
    }

    if (!identifier && ['STATUS', 'DETALHES'].includes(action)) {
      await send('📌 Informe a nota (ex: "Status da nota 123").');
      return { status: 'identifier_required' };
    }

    if (action === 'RESUMO') {
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      const baseWhere: any = {
        tenantId: tenant.id,
        date: { gte: today, lt: tomorrow },
      };

      if (role === 'TRANSPORTER' && actor?.id) {
        baseWhere.carrierId = actor.id;
      }

      const [routesCount, deliveriesCount, deliveredCount, failedCount] =
        await Promise.all([
          (this.prisma as any).route.count({
            where: { tenantId: tenant.id, date: { gte: today, lt: tomorrow } },
          }),
          (this.prisma as any).delivery.count({
            where: baseWhere,
          }),
          (this.prisma as any).delivery.count({
            where: { ...baseWhere, status: 'DELIVERED' },
          }),
          (this.prisma as any).delivery.count({
            where: { ...baseWhere, status: { in: ['FAILED', 'RETURNED'] } },
          }),
        ]);

      await send(
        `📊 *Resumo de Hoje*\n\nRotas: ${routesCount}\nEntregas: ${deliveriesCount}\n✅ Entregues: ${deliveredCount}\n⚠️ Falhas: ${failedCount}`,
      );
      return { status: 'summary_sent' };
    }

    if (action === 'LISTAR') {
      const where: any = {
        tenantId: tenant.id,
        status: { in: ['PENDING', 'IN_TRANSIT'] },
      };

      if (role === 'SELLER') {
        where.customer = { sellerId: actor.id };
      }

      if (role === 'TRANSPORTER' && actor?.id) {
        where.carrierId = actor.id;
      }

      const pending = await (this.prisma as any).delivery.findMany({
        where,
        take: 5,
        include: { customer: true, route: true },
      });

      if (pending.length === 0) {
        await send('🎉 Nenhuma entrega pendente no momento.');
        return { status: 'list_empty' };
      }

      const list = pending
        .map(
          (d: any, i: number) =>
            `${i + 1}. ${d.customer?.tradeName || 'Cliente'} (${d.invoiceNumber})`,
        )
        .join('\n');
      await send(`📋 *Pendentes (top 5)*\n\n${list}`);
      return { status: 'list_sent' };
    }

    if (action === 'STATUS' || action === 'DETALHES') {
      let where: any = { invoiceNumber: identifier, tenantId: tenant.id };

      if (role === 'CUSTOMER') {
        where.customerId = actor.id;
      }

      if (role === 'SELLER') {
        where.customer = { sellerId: actor.id };
      }

      if (role === 'TRANSPORTER' && actor?.id) {
        where.carrierId = actor.id;
      }

      const delivery = await (this.prisma as any).delivery.findFirst({
        where,
        include: { customer: true, route: true, driver: true },
      });

      if (!delivery) {
        await send('⚠️ Nota não encontrada.');
        return { status: 'not_found' };
      }

      if (action === 'STATUS') {
        await send(
          `🔎 *Status da Nota ${delivery.invoiceNumber}*\n\n` +
            `Cliente: ${delivery.customer?.tradeName || 'N/A'}\n` +
            `Status: ${delivery.status}\n` +
            `Rota: ${delivery.route?.name || 'N/A'}`,
        );
        return { status: 'status_sent' };
      }

      await send(
        `📄 *Detalhes da Nota ${delivery.invoiceNumber}*\n\n` +
          `Cliente: ${delivery.customer?.tradeName || 'N/A'}\n` +
          `Status: ${delivery.status}\n` +
          `Rota: ${delivery.route?.name || 'N/A'}\n` +
          `Motorista: ${delivery.driver?.name || 'N/A'}`,
      );
      return { status: 'details_sent' };
    }

    await send('🤔 Comando não permitido para este perfil. Digite "Ajuda".');
    return { status: 'action_not_allowed' };
  }

  async processSendPulseMessage(event: any) {
    const message = this.normalization.normalize('SENDPULSE', event);
    if (!message) return { status: 'ignored_or_invalid' };
    return this.processMessage(message);
  }

  async processMessage(payload: any) {
    // 1. Normalização
    const message = payload.provider
      ? payload
      : this.normalization.normalize('ZAPI', payload);

    if (!message || !message.rawPhone) {
      return { status: 'ignored' };
    }

    this.logger.log(
      `📱 Webhook recebido de: ${message.rawPhone} | Tipo: ${message.type}`,
    );

    // 2. Identificação do Papel
    const identity = await this.identity.identifyActor(message.rawPhone);

    if (!identity || identity.role === 'UNKNOWN' || !identity.tenant) {
      this.logger.warn(`⚠️ Contato não autorizado.`);
      return { status: 'actor_not_found' };
    }

    const role = identity.role;
    const driver = identity.driver;

    if (role === 'DRIVER' && driver) {
      this.logger.log(
        `✅ Motorista identificado: ${driver.name} (ID: ${driver.id})`,
      );
    } else {
      this.logger.log(`✅ Contato identificado como ${role}`);
    }

    // Responder para o número que enviou a mensagem
    const replyPhone = message.rawPhone.replace(/\D/g, '');
    const send = (msg: string) =>
      this.responder.send(replyPhone, msg, identity.tenant);

    // 3. Interpretação (IA)
    if (message.type === MessageType.LOCATION) {
      await send('📍 Localização recebida.');
      return { status: 'location_updated' };
    }

    const text =
      message.type === MessageType.TEXT
        ? message.payload.text
        : message.payload.caption || undefined;
    const imageUrl =
      message.type === MessageType.IMAGE ? message.payload.url : undefined;
    const audioUrl =
      message.type === MessageType.AUDIO ? message.payload.url : undefined;

    const aiResult = await this.aiService.processMessage(
      driver?.id || identity.seller?.id || identity.customer?.id || role,
      text,
      imageUrl,
      audioUrl,
      role,
    );

    if (!aiResult || aiResult.action === 'UNKNOWN') {
      await send(
        "🤔 Não entendi. Tente comandos como 'Iniciar rota', 'Entreguei a nota X' ou 'Ajuda'.",
      );
      return { status: 'learning_queued' };
    }

    if (aiResult.action === 'AJUDA') {
      await send(this.getHelpMessage(role));
      return { status: 'help_sent' };
    }

    if (role !== 'DRIVER' && role !== 'THIRD_PARTY_DRIVER') {
      return this.handleNonDriverAction(
        role,
        identity.seller || identity.customer || identity.carrier || identity,
        identity.tenant,
        aiResult,
        send,
      );
    }

    const allowedActions = this.getAllowedActions(role);
    if (!allowedActions.includes(aiResult.action)) {
      await send('🤔 Comando não permitido para este perfil. Digite "Ajuda".');
      return { status: 'action_not_allowed' };
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
        status: { in: ['PLANNED', 'ACTIVE'] },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        deliveries: { include: { customer: { include: { seller: true } } } },
      },
    });

    if (activeRoutes.length === 0) {
      const greeting = this.responder.getGreeting();
      await send(
        `${greeting}, ${driver.name}! 👋\nNo momento, não encontrei nenhuma rota agendada para você hoje.`,
      );
      return { status: 'no_active_route' };
    }

    const { action, identifier, reason } = aiResult;
    const targetRoute =
      activeRoutes.find((r: any) => r.status === 'ACTIVE') || activeRoutes[0];

    // --- AÇÕES ---

    // --- CONTROLE DE JORNADA ---
    const journeyActions: Record<string, any> = {
      INICIO_JORNADA: 'JOURNEY_START',
      FIM_JORNADA: 'JOURNEY_END',
      INICIO_ALMOCO: 'MEAL_START',
      FIM_ALMOCO: 'MEAL_END',
      INICIO_DESCANSO: 'REST_START',
      FIM_DESCANSO: 'REST_END',
      INICIO_ESPERA: 'WAIT_START',
      FIM_ESPERA: 'WAIT_END',
      PAUSA: 'REST_START', // Mapeando PAUSA genérica para descanso
      RETOMADA: 'REST_END',
    };

    if (journeyActions[action]) {
      try {
        const eventType = journeyActions[action];
        await this.journeyService.createEvent(driver.tenant.id, driver.id, {
          type: eventType,
          latitude:
            message.type === MessageType.LOCATION
              ? message.payload.latitude
              : undefined,
          longitude:
            message.type === MessageType.LOCATION
              ? message.payload.longitude
              : undefined,
          locationAddress:
            message.type === MessageType.LOCATION
              ? message.payload.address
              : undefined,
          notes: reason,
        });

        const messages: Record<string, string> = {
          JOURNEY_START: '☀️ Jornada iniciada! Bom trabalho.',
          JOURNEY_END: '🌙 Jornada encerrada. Bom descanso!',
          MEAL_START: '🍽️ Bom almoço! (Mínimo 1h)',
          MEAL_END: '🔋 De volta do almoço.',
          REST_START: 'zzZ Bom descanso.',
          REST_END: '▶️ De volta ao trabalho.',
          WAIT_START: '⏳ Espera iniciada.',
          WAIT_END: '✅ Espera finalizada.',
        };

        await send(messages[eventType] || '✅ Status atualizado.');
        return { status: 'journey_updated', type: eventType };
      } catch (error: any) {
        await send(`⚠️ ${error.message}`);
        return { status: 'journey_error', error: error.message };
      }
    }

    // --- AÇÕES DE ROTA ---

    if (action === 'INICIO') {
      // Validação de Jornada: Só pode iniciar rota se estiver em jornada (SE a empresa exigir)
      const config = (driver as any).tenant.config as any;
      const journeyControlEnabled = config?.journeyControlEnabled !== false; // Padrão true se não definido, ou ajustar conforme regra de negócio

      if (
        role === 'DRIVER' &&
        journeyControlEnabled &&
        (driver as any).currentJourneyStatus !== 'JOURNEY_START'
      ) {
        await send(
          `🚫 Você precisa iniciar sua jornada antes de sair para a rota.\n\nDigite *"Iniciar jornada"* ou *"Bater ponto"*.`,
        );
        return { status: 'journey_required' };
      }

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
        await send('⚠️ Nenhuma rota ativa.');
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
      const delivery = targetRoute.deliveries.find(
        (d: any) =>
          d.invoiceNumber === identifier ||
          d.customer.tradeName
            .toLowerCase()
            .includes(identifier?.toLowerCase() || ''),
      );

      if (!delivery) {
        await send(`❌ Entrega não encontrada.`);
        return { status: 'not_found' };
      }

      const status = action === 'ENTREGA' ? 'DELIVERED' : 'FAILED';
      const success = await this.routeCommand.handleDeliveryUpdate(
        delivery.id,
        status,
        reason,
        imageUrl,
      );

      if (!success) {
        await send(`⚠️ Entrega já finalizada.`);
        return { status: 'already_done' };
      }

      // Verifica se acabou a rota
      const pendingCount = await (this.prisma as any).delivery.count({
        where: {
          routeId: targetRoute.id,
          status: { in: ['PENDING', 'IN_TRANSIT'] },
        },
      });

      if (pendingCount === 0) {
        await this.routeCommand.handleFinishRoute(targetRoute.id);
        await send(`🎉 *Rota Finalizada!*`);
      } else {
        await send(
          `${action === 'ENTREGA' ? '✅' : '⚠️'} Registrado. Faltam: ${pendingCount}.`,
        );
      }
      return { status: 'success', action: status };
    }

    if (['CHEGADA', 'INICIO_DESCARGA', 'FIM_DESCARGA'].includes(action)) {
      const delivery = targetRoute.deliveries.find(
        (d: any) => d.status === 'IN_TRANSIT' || d.status === 'PENDING',
      );
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
      const done = targetRoute.deliveries.filter(
        (d: any) => d.status === 'DELIVERED',
      ).length;
      await send(`📊 Resumo: ${done}/${total} entregues.`);
      return { status: 'summary_sent' };
    }

    if (action === 'LISTAR') {
      const pending = targetRoute.deliveries.filter(
        (d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT',
      );
      if (pending.length === 0) {
        await send(`🎉 Tudo entregue! Nenhuma pendência.`);
      } else {
        const list = pending
          .map(
            (d: any, i: number) =>
              `${i + 1}. ${d.customer.tradeName} (${d.invoiceNumber})`,
          )
          .join('\n');
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
      const nextDelivery = targetRoute.deliveries.find(
        (d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT',
      );
      if (!nextDelivery) {
        await send(`⚠️ Nenhuma entrega pendente para navegar.`);
        return { status: 'no_target' };
      }
      const address = `${nextDelivery.customer.address}, ${nextDelivery.customer.city} - ${nextDelivery.customer.state}`;
      const mapsLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
      await send(
        `🗺️ *Navegação para ${nextDelivery.customer.tradeName}*\n\n📍 Endereço: ${address}\n🔗 Link: ${mapsLink}`,
      );
      await this.responder.sendLocation(
        replyPhone,
        nextDelivery.customer.latitude,
        nextDelivery.customer.longitude,
        nextDelivery.customer.tradeName,
        address,
        driver.tenant,
      );
      return { status: 'navigation_sent' };
    }

    if (action === 'CONTATO') {
      const target =
        targetRoute.deliveries.find(
          (d: any) =>
            d.invoiceNumber === identifier ||
            d.customer.tradeName
              .toLowerCase()
              .includes(identifier?.toLowerCase() || ''),
        ) ||
        targetRoute.deliveries.find(
          (d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT',
        );

      if (!target) {
        await send(`⚠️ Cliente não encontrado.`);
        return { status: 'not_found' };
      }
      await send(
        `📞 *Contato do Cliente*\n\n👤 ${target.customer.tradeName}\n📱 ${target.customer.phone}\n🗣️ Responsável: ${target.customer.contactName || 'Não informado'}`,
      );
      // Enviar contato como vCard se possível (futuro)
      return { status: 'contact_sent' };
    }

    if (action === 'VENDEDOR') {
      const target = targetRoute.deliveries.find(
        (d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT',
      );
      if (!target || !target.customer.seller) {
        await send(`⚠️ Vendedor não identificado para o cliente atual.`);
        return { status: 'seller_not_found' };
      }
      await send(
        `💼 *Vendedor Responsável*\n\n👤 ${target.customer.seller.name}\n📱 ${target.customer.seller.phone || 'Sem telefone'}`,
      );
      return { status: 'seller_sent' };
    }

    if (action === 'SUPERVISOR') {
      // Pegar do tenant config ou env
      const config = driver.tenant.config as any;
      const supervisorPhone =
        config?.supervisorPhone ||
        process.env.SUPERVISOR_PHONE ||
        'Não configurado';
      await send(
        `🚨 *Contato da Base/Supervisor*\n\n📱 ${supervisorPhone}\n\nLigue em caso de emergência.`,
      );
      return { status: 'supervisor_sent' };
    }

    if (action === 'SINISTRO') {
      await send(
        `⚠️ *SINISTRO REGISTRADO*\n\nA base foi notificada. Se houver feridos, ligue 190.\nPor favor, envie fotos e áudio explicando o ocorrido.`,
      );
      // TODO: Disparar alerta crítico para o painel
      return { status: 'incident_reported' };
    }

    if (action === 'ATRASO') {
      await send(
        `⏱️ Atraso registrado: "${reason || 'Não informado'}". A base foi avisada.`,
      );
      // TODO: Atualizar ETA da rota
      return { status: 'delay_reported' };
    }

    if (action === 'DETALHES') {
      const target =
        targetRoute.deliveries.find(
          (d: any) =>
            d.invoiceNumber === identifier ||
            d.customer.tradeName
              .toLowerCase()
              .includes(identifier?.toLowerCase() || ''),
        ) ||
        targetRoute.deliveries.find(
          (d: any) => d.status === 'PENDING' || d.status === 'IN_TRANSIT',
        );

      if (!target) {
        await send(`⚠️ Entrega não encontrada.`);
        return { status: 'not_found' };
      }

      const items = target.items
        ? typeof target.items === 'string'
          ? JSON.parse(target.items)
          : target.items
        : [];
      const itemsList = items
        .map((i: any) => `- ${i.quantity}x ${i.description}`)
        .join('\n');

      await send(
        `📄 *Detalhes da Nota ${target.invoiceNumber}*\n\n👤 ${target.customer.tradeName}\n💰 Valor: R$ ${target.value}\n\n📦 *Itens:*\n${itemsList || 'Sem itens listados'}`,
      );
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
      await send(
        `⚠️ Funcionalidade de desfazer ainda em desenvolvimento. Por favor, contate a base para corrigir.`,
      );
      return { status: 'undo_not_implemented' };
    }

    if (action === 'OUTRO' || action === 'UNKNOWN') {
      // Se for conversa fiada ou dúvida, usa o Chat do Leônidas
      const chatResponse = await this.aiService.chatWithLeonidas(
        text || '',
        `Motorista: ${driver.name}. Rota: ${targetRoute.name}`,
      );
      await send(chatResponse);
      return { status: 'chat_response' };
    }

    await send('Comando recebido.');
    return { status: 'processed' };
  }
}
