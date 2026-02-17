import { Test, TestingModule } from '@nestjs/testing';
import { WhatsappService, ProviderConfig } from './whatsapp.service';
import { ZapiProvider } from './providers/zapi.provider';
import { SendpulseProvider } from './providers/sendpulse.provider';

// Mock dos providers
jest.mock('./providers/zapi.provider');
jest.mock('./providers/sendpulse.provider');

describe('WhatsappService', () => {
  let service: WhatsappService;
  let mockZapiProvider: jest.Mocked<ZapiProvider>;
  let mockSendpulseProvider: jest.Mocked<SendpulseProvider>;

  beforeEach(async () => {
    // Clear all mocks
    jest.clearAllMocks();

    // Create mock instances
    mockZapiProvider = {
      sendText: jest.fn().mockResolvedValue(undefined),
      sendTemplate: jest.fn().mockResolvedValue(undefined),
      sendImage: jest.fn().mockResolvedValue(undefined),
      sendAudio: jest.fn().mockResolvedValue(undefined),
      sendLocation: jest.fn().mockResolvedValue(undefined),
      sendLink: jest.fn().mockResolvedValue(undefined),
    } as any;

    mockSendpulseProvider = {
      sendText: jest.fn().mockResolvedValue(undefined),
      sendTemplate: jest.fn().mockResolvedValue(undefined),
      sendImage: jest.fn().mockResolvedValue(undefined),
      sendAudio: jest.fn().mockResolvedValue(undefined),
      sendLocation: jest.fn().mockResolvedValue(undefined),
      sendLink: jest.fn().mockResolvedValue(undefined),
    } as any;

    // Mock constructor implementations
    (ZapiProvider as jest.Mock).mockImplementation(() => mockZapiProvider);
    (SendpulseProvider as jest.Mock).mockImplementation(
      () => mockSendpulseProvider,
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [WhatsappService],
    }).compile();

    service = module.get<WhatsappService>(WhatsappService);
  });

  describe('sendText', () => {
    const zapiConfig: ProviderConfig = {
      type: 'ZAPI',
      zapiInstanceId: 'test-instance',
      zapiToken: 'test-token',
      zapiClientToken: 'test-client-token',
    };

    it('deve enviar mensagem de texto usando ZAPI', async () => {
      await service.sendText('5511999999999', 'Olá, teste!', zapiConfig);

      expect(ZapiProvider).toHaveBeenCalledWith(
        'test-instance',
        'test-token',
        'test-client-token',
      );
      expect(mockZapiProvider.sendText).toHaveBeenCalledWith(
        '5511999999999',
        'Olá, teste!',
      );
    });

    it('deve enviar mensagem usando Sendpulse', async () => {
      const sendpulseConfig: ProviderConfig = {
        type: 'SENDPULSE',
        sendpulseClientId: 'client-id',
        sendpulseClientSecret: 'client-secret',
        sendpulseBotId: 'bot-id',
      };

      await service.sendText(
        '5511999999999',
        'Olá via Sendpulse!',
        sendpulseConfig,
      );

      expect(SendpulseProvider).toHaveBeenCalledWith(
        'client-id',
        'client-secret',
        'bot-id',
      );
      expect(mockSendpulseProvider.sendText).toHaveBeenCalledWith(
        '5511999999999',
        'Olá via Sendpulse!',
      );
    });

    it('deve usar configuração padrão do ambiente se não fornecida', async () => {
      process.env.ZAPI_INSTANCE_ID = 'env-instance';
      process.env.ZAPI_TOKEN = 'env-token';
      process.env.ZAPI_CLIENT_TOKEN = 'env-client-token';

      await service.sendText('5511999999999', 'Mensagem com config padrão');

      expect(ZapiProvider).toHaveBeenCalled();
      expect(mockZapiProvider.sendText).toHaveBeenCalled();
    });

    it('não deve enviar se provider não estiver configurado', async () => {
      const invalidConfig: ProviderConfig = {
        type: 'ZAPI',
        // Faltando credenciais
      };

      await service.sendText('5511999999999', 'Teste', invalidConfig);

      expect(mockZapiProvider.sendText).not.toHaveBeenCalled();
    });
  });

  describe('sendTemplate', () => {
    const zapiConfig: ProviderConfig = {
      type: 'ZAPI',
      zapiInstanceId: 'test-instance',
      zapiToken: 'test-token',
    };

    it('deve enviar template com variáveis', async () => {
      const variables = ['João', '15/02/2026', '10:30'];

      await service.sendTemplate(
        '5511999999999',
        'confirmacao_entrega',
        variables,
        zapiConfig,
      );

      expect(mockZapiProvider.sendTemplate).toHaveBeenCalledWith(
        '5511999999999',
        'confirmacao_entrega',
        variables,
      );
    });
  });

  describe('sendImage', () => {
    const zapiConfig: ProviderConfig = {
      type: 'ZAPI',
      zapiInstanceId: 'test-instance',
      zapiToken: 'test-token',
    };

    it('deve enviar imagem com caption', async () => {
      const imageUrl = 'https://example.com/image.jpg';
      const caption = 'Comprovante de entrega';

      await service.sendImage('5511999999999', imageUrl, caption, zapiConfig);

      expect(mockZapiProvider.sendImage).toHaveBeenCalledWith(
        '5511999999999',
        imageUrl,
        caption,
      );
    });

    it('deve enviar imagem sem caption', async () => {
      const imageUrl = 'https://example.com/image.jpg';

      await service.sendImage('5511999999999', imageUrl, undefined, zapiConfig);

      expect(mockZapiProvider.sendImage).toHaveBeenCalledWith(
        '5511999999999',
        imageUrl,
        undefined,
      );
    });
  });

  describe('sendAudio', () => {
    const zapiConfig: ProviderConfig = {
      type: 'ZAPI',
      zapiInstanceId: 'test-instance',
      zapiToken: 'test-token',
    };

    it('deve enviar áudio', async () => {
      const audioUrl = 'https://example.com/audio.mp3';

      await service.sendAudio('5511999999999', audioUrl, zapiConfig);

      expect(mockZapiProvider.sendAudio).toHaveBeenCalledWith(
        '5511999999999',
        audioUrl,
      );
    });
  });

  describe('sendLocation', () => {
    const zapiConfig: ProviderConfig = {
      type: 'ZAPI',
      zapiInstanceId: 'test-instance',
      zapiToken: 'test-token',
    };

    it('deve enviar localização com título e endereço', async () => {
      const lat = -23.5505;
      const lng = -46.6333;
      const title = 'Ponto de Entrega';
      const address = 'Av. Paulista, 1000 - São Paulo, SP';

      await service.sendLocation(
        '5511999999999',
        lat,
        lng,
        title,
        address,
        zapiConfig,
      );

      expect(mockZapiProvider.sendLocation).toHaveBeenCalledWith(
        '5511999999999',
        lat,
        lng,
        title,
        address,
      );
    });

    it('deve enviar localização sem título e endereço', async () => {
      const lat = -23.5505;
      const lng = -46.6333;

      await service.sendLocation(
        '5511999999999',
        lat,
        lng,
        undefined,
        undefined,
        zapiConfig,
      );

      expect(mockZapiProvider.sendLocation).toHaveBeenCalledWith(
        '5511999999999',
        lat,
        lng,
        undefined,
        undefined,
      );
    });
  });

  describe('sendLink', () => {
    const zapiConfig: ProviderConfig = {
      type: 'ZAPI',
      zapiInstanceId: 'test-instance',
      zapiToken: 'test-token',
    };

    it('deve enviar link com título', async () => {
      const linkUrl = 'https://zaproute.com/tracking/123';
      const title = 'Rastreie sua entrega';

      await service.sendLink('5511999999999', linkUrl, title, zapiConfig);

      expect(mockZapiProvider.sendLink).toHaveBeenCalledWith(
        '5511999999999',
        linkUrl,
        title,
      );
    });
  });

  describe('Provider Caching', () => {
    const zapiConfig: ProviderConfig = {
      type: 'ZAPI',
      zapiInstanceId: 'test-instance',
      zapiToken: 'test-token',
    };

    it('deve reutilizar provider em cache para mesma configuração', async () => {
      // Primeira chamada
      await service.sendText('5511999999999', 'Mensagem 1', zapiConfig);

      // Segunda chamada com mesma config
      await service.sendText('5511999999999', 'Mensagem 2', zapiConfig);

      // Provider deve ser instanciado apenas uma vez
      expect(ZapiProvider).toHaveBeenCalledTimes(1);

      // Mas sendText deve ser chamado duas vezes
      expect(mockZapiProvider.sendText).toHaveBeenCalledTimes(2);
    });

    it('deve criar novo provider para configuração diferente', async () => {
      const config1: ProviderConfig = {
        type: 'ZAPI',
        zapiInstanceId: 'instance-1',
        zapiToken: 'token-1',
      };

      const config2: ProviderConfig = {
        type: 'ZAPI',
        zapiInstanceId: 'instance-2',
        zapiToken: 'token-2',
      };

      await service.sendText('5511999999999', 'Mensagem 1', config1);
      await service.sendText('5511999999999', 'Mensagem 2', config2);

      // Provider deve ser instanciado duas vezes (configs diferentes)
      expect(ZapiProvider).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Handling', () => {
    it('deve lidar com erro de provider', async () => {
      const zapiConfig: ProviderConfig = {
        type: 'ZAPI',
        zapiInstanceId: 'test-instance',
        zapiToken: 'test-token',
      };

      mockZapiProvider.sendText.mockRejectedValue(new Error('API Error'));

      await expect(
        service.sendText('5511999999999', 'Teste', zapiConfig),
      ).rejects.toThrow('API Error');
    });
  });
});
