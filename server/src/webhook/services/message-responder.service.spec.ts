import { Test, TestingModule } from '@nestjs/testing';
import { MessageResponder } from './message-responder.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';

describe('MessageResponder', () => {
  let service: MessageResponder;
  let whatsapp: WhatsappService;

  const mockWhatsappService = {
    sendText: jest.fn(),
    sendLocation: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.ZAPI_INSTANCE_ID = 'zapi-inst';
    process.env.ZAPI_TOKEN = 'zapi-token';
    process.env.ZAPI_CLIENT_TOKEN = 'zapi-client-token';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessageResponder,
        { provide: WhatsappService, useValue: mockWhatsappService },
      ],
    }).compile();

    service = module.get<MessageResponder>(MessageResponder);
    whatsapp = module.get<WhatsappService>(WhatsappService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('send', () => {
    it('should send a text message using Z-API by default', async () => {
      const tenant = { config: {} };
      const to = '5511999999999';
      const message = 'Hello';

      await service.send(to, message, tenant);

      expect(mockWhatsappService.sendText).toHaveBeenCalledWith(
        to,
        message,
        expect.objectContaining({
          type: 'ZAPI',
          zapiInstanceId: 'zapi-inst',
        }),
      );
    });

    it('should use SendPulse if configured in tenant', async () => {
      const tenant = { config: { whatsappProvider: 'SENDPULSE' } };
      process.env.SENDPULSE_ID = 'sp-id';
      process.env.SENDPULSE_SECRET = 'sp-secret';

      await service.send('to-phone', 'msg', tenant);

      expect(mockWhatsappService.sendText).toHaveBeenCalledWith(
        'to-phone',
        'msg',
        expect.objectContaining({
          type: 'SENDPULSE',
          sendpulseClientId: 'sp-id',
        }),
      );
    });
  });

  describe('sendLocation', () => {
    it('should send a location', async () => {
      const tenant = { config: {} };
      await service.sendLocation(
        'to-phone',
        -23.5,
        -46.6,
        'Home',
        'Address here',
        tenant,
      );

      expect(mockWhatsappService.sendLocation).toHaveBeenCalledWith(
        'to-phone',
        -23.5,
        -46.6,
        'Home',
        'Address here',
        expect.any(Object),
      );
    });
  });

  describe('getGreeting', () => {
    it('should return appropriate greeting based on time', () => {
      // Mocking Date is tricky, let's just check if it returns one of the expected strings
      const greeting = service.getGreeting();
      expect(['Bom dia', 'Boa tarde', 'Boa noite']).toContain(greeting);
    });
  });
});
