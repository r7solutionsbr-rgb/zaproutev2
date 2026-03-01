import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { PrismaService } from '../prisma.service';
import { AiService } from '../ai/ai.service';
import { NormalizationService } from './services/normalization.service';
import { BotIdentityService } from './services/bot-identity.service';
import { RouteCommandService } from './services/route-command.service';
import { MessageResponder } from './services/message-responder.service';
import { JourneyService } from '../journey/journey.service';
import { MessageType } from './dto/incoming-message.dto';

describe('WebhookService', () => {
  let service: WebhookService;
  let prisma: PrismaService;
  let aiService: AiService;
  let normalization: NormalizationService;
  let identityService: BotIdentityService;
  let routeCommand: RouteCommandService;
  let responder: MessageResponder;
  let journeyService: JourneyService;

  const mockPrismaService = {
    route: { findMany: jest.fn() },
    delivery: { count: jest.fn() },
  };

  const mockAiService = {
    processMessage: jest.fn(),
    chatWithLeonidas: jest.fn(),
  };

  const mockNormalization = {
    normalize: jest.fn(),
  };

  const mockIdentityService = {
    identifyActor: jest.fn(),
  };

  const mockRouteCommand = {
    handleStartRoute: jest.fn(),
    handleExitRoute: jest.fn(),
    handleDeliveryUpdate: jest.fn(),
    handleFinishRoute: jest.fn(),
    handleWorkflowStep: jest.fn(),
  };

  const mockResponder = {
    send: jest.fn(),
    sendLocation: jest.fn(),
    getGreeting: jest.fn().mockReturnValue('Bom dia'),
  };

  const mockJourneyService = {
    createEvent: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AiService, useValue: mockAiService },
        { provide: NormalizationService, useValue: mockNormalization },
        { provide: BotIdentityService, useValue: mockIdentityService },
        { provide: RouteCommandService, useValue: mockRouteCommand },
        { provide: MessageResponder, useValue: mockResponder },
        { provide: JourneyService, useValue: mockJourneyService },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
    prisma = module.get<PrismaService>(PrismaService);
    aiService = module.get<AiService>(AiService);
    normalization = module.get<NormalizationService>(NormalizationService);
    identityService = module.get<BotIdentityService>(BotIdentityService);
    routeCommand = module.get<RouteCommandService>(RouteCommandService);
    responder = module.get<MessageResponder>(MessageResponder);
    journeyService = module.get<JourneyService>(JourneyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processMessage', () => {
    const mockDriver = {
      id: 'driver-1',
      name: 'João',
      tenant: { id: 'tenant-1', config: {} },
    };

    const mockIdentity = {
      role: 'DRIVER',
      driver: mockDriver,
      tenant: mockDriver.tenant,
    };

    const incomingMsg = {
      provider: 'ZAPI',
      rawPhone: '5511999999999',
      type: MessageType.TEXT,
      payload: { text: 'Olá' },
    };

    it('should return ignored if message cannot be normalized', async () => {
      mockNormalization.normalize.mockReturnValue(null);
      const result = await service.processMessage({});
      expect(result).toEqual({ status: 'ignored' });
    });

    it('should return driver_not_found if driver identification fails', async () => {
      mockNormalization.normalize.mockReturnValue(incomingMsg);
      mockIdentityService.identifyActor.mockResolvedValue(null);

      const result = await service.processMessage(incomingMsg);

      expect(result).toEqual({ status: 'actor_not_found' });
      expect(mockIdentityService.identifyActor).toHaveBeenCalledWith(
        '5511999999999',
      );
    });

    it('should handle location message specially', async () => {
      const locMsg = {
        ...incomingMsg,
        type: MessageType.LOCATION,
        payload: { latitude: 1, longitude: 2 },
      };
      mockNormalization.normalize.mockReturnValue(locMsg);
      mockIdentityService.identifyActor.mockResolvedValue(mockIdentity);

      const result = await service.processMessage(locMsg);

      expect(result).toEqual({ status: 'location_updated' });
      expect(mockResponder.send).toHaveBeenCalledWith(
        '5511999999999',
        expect.stringContaining('📍'),
        expect.any(Object),
      );
    });

    it('should return help_sent if AI recognizes AJUDA action', async () => {
      mockNormalization.normalize.mockReturnValue(incomingMsg);
      mockIdentityService.identifyActor.mockResolvedValue(mockIdentity);
      mockAiService.processMessage.mockResolvedValue({ action: 'AJUDA' });

      const result = await service.processMessage(incomingMsg);

      expect(result).toEqual({ status: 'help_sent' });
      expect(mockResponder.send).toHaveBeenCalledWith(
        '5511999999999',
        expect.stringContaining('Comandos ZapRoute'),
        expect.any(Object),
      );
    });

    it('should return no_active_route if no routes are scheduled for today', async () => {
      mockNormalization.normalize.mockReturnValue(incomingMsg);
      mockIdentityService.identifyActor.mockResolvedValue(mockIdentity);
      mockAiService.processMessage.mockResolvedValue({ action: 'RESUMO' });
      mockPrismaService.route.findMany.mockResolvedValue([]);

      const result = await service.processMessage(incomingMsg);

      expect(result).toEqual({ status: 'no_active_route' });
      expect(mockResponder.send).toHaveBeenCalledWith(
        '5511999999999',
        expect.stringContaining('não encontrei nenhuma rota'),
        expect.any(Object),
      );
    });

    it('should handle INICIO_JORNADA command', async () => {
      mockNormalization.normalize.mockReturnValue(incomingMsg);
      mockIdentityService.identifyActor.mockResolvedValue(mockIdentity);
      mockAiService.processMessage.mockResolvedValue({
        action: 'INICIO_JORNADA',
      });
      mockPrismaService.route.findMany.mockResolvedValue([
        { id: 'route-1', status: 'PLANNED', deliveries: [] },
      ]);

      const result = await service.processMessage(incomingMsg);

      expect(result).toEqual({
        status: 'journey_updated',
        type: 'JOURNEY_START',
      });
      expect(mockJourneyService.createEvent).toHaveBeenCalled();
      expect(mockResponder.send).toHaveBeenCalledWith(
        '5511999999999',
        expect.stringContaining('Jornada iniciada'),
        expect.any(Object),
      );
    });

    it('should handle INICIO route action', async () => {
      mockNormalization.normalize.mockReturnValue(incomingMsg);
      mockIdentityService.identifyActor.mockResolvedValue({
        role: 'DRIVER',
        driver: { ...mockDriver, currentJourneyStatus: 'JOURNEY_START' },
        tenant: mockDriver.tenant,
      });
      mockAiService.processMessage.mockResolvedValue({ action: 'INICIO' });
      mockPrismaService.route.findMany.mockResolvedValue([
        { id: 'route-1', status: 'PLANNED', name: 'Rota 1', deliveries: [] },
      ]);

      const result = await service.processMessage(incomingMsg);

      expect(result).toEqual({ status: 'route_started' });
      expect(mockRouteCommand.handleStartRoute).toHaveBeenCalledWith(
        'driver-1',
        'route-1',
      );
      expect(mockResponder.send).toHaveBeenCalledWith(
        '5511999999999',
        expect.stringContaining('Rota Iniciada'),
        expect.any(Object),
      );
    });

    it('should handle ENTREGA action', async () => {
      const delivery = {
        id: 'del-1',
        invoiceNumber: '123',
        customer: { tradeName: 'Client' },
      };
      const activeRoute = {
        id: 'route-1',
        status: 'ACTIVE',
        deliveries: [delivery],
      };

      mockNormalization.normalize.mockReturnValue(incomingMsg);
      mockIdentityService.identifyActor.mockResolvedValue(mockIdentity);
      mockAiService.processMessage.mockResolvedValue({
        action: 'ENTREGA',
        identifier: '123',
      });
      mockPrismaService.route.findMany.mockResolvedValue([activeRoute]);
      mockRouteCommand.handleDeliveryUpdate.mockResolvedValue(true);
      mockPrismaService.delivery.count.mockResolvedValue(1);

      const result = await service.processMessage(incomingMsg);

      expect(result).toEqual({ status: 'success', action: 'DELIVERED' });
      expect(mockRouteCommand.handleDeliveryUpdate).toHaveBeenCalledWith(
        'del-1',
        'DELIVERED',
        undefined,
        undefined,
      );
    });

    it('should handle NAVEGACAO action', async () => {
      const delivery = {
        id: 'del-1',
        status: 'PENDING',
        customer: {
          tradeName: 'Client',
          address: 'Street 1',
          city: 'City',
          latitude: 1,
          longitude: 2,
        },
      };
      const activeRoute = {
        id: 'route-1',
        status: 'ACTIVE',
        deliveries: [delivery],
      };

      mockNormalization.normalize.mockReturnValue(incomingMsg);
      mockIdentityService.identifyActor.mockResolvedValue(mockIdentity);
      mockAiService.processMessage.mockResolvedValue({ action: 'NAVEGACAO' });
      mockPrismaService.route.findMany.mockResolvedValue([activeRoute]);

      const result = await service.processMessage(incomingMsg);

      expect(result).toEqual({ status: 'navigation_sent' });
      expect(mockResponder.sendLocation).toHaveBeenCalled();
    });

    it('should fallback to chatWithLeonidas for OUTRO action', async () => {
      mockNormalization.normalize.mockReturnValue(incomingMsg);
      mockIdentityService.identifyActor.mockResolvedValue(mockIdentity);
      mockAiService.processMessage.mockResolvedValue({ action: 'OUTRO' });
      mockAiService.chatWithLeonidas.mockResolvedValue('I am Leonidas');
      mockPrismaService.route.findMany.mockResolvedValue([
        { id: 'route-1', status: 'ACTIVE', name: 'R1', deliveries: [] },
      ]);

      const result = await service.processMessage({
        ...incomingMsg,
        payload: { text: 'Oi Leonidas' },
      });

      expect(result).toEqual({ status: 'chat_response' });
      expect(mockAiService.chatWithLeonidas).toHaveBeenCalled();
      expect(mockResponder.send).toHaveBeenCalledWith(
        '5511999999999',
        'I am Leonidas',
        expect.any(Object),
      );
    });
  });

  describe('processSendPulseMessage', () => {
    it('should normalize and process SendPulse event', async () => {
      const event = { id: 'sp-event' };
      const normalizedMsg = { rawPhone: '55110', provider: 'SENDPULSE' };

      mockNormalization.normalize.mockReturnValue(normalizedMsg);
      // Mocking processMessage briefly since we're testing the delegation
      jest
        .spyOn(service, 'processMessage')
        .mockResolvedValue({ status: 'ok' } as any);

      await service.processSendPulseMessage(event);

      expect(normalization.normalize).toHaveBeenCalledWith('SENDPULSE', event);
      expect(service.processMessage).toHaveBeenCalledWith(normalizedMsg);
    });
  });
});
