import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { PrismaService } from '../prisma.service';
import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';

jest.mock('@google/generative-ai');
jest.mock('axios');

describe('AiService', () => {
  let service: AiService;
  let prisma: PrismaService;
  let mockGenAI: any;
  let mockModel: any;
  let mockChat: any;

  const mockPrismaService = {
    aiLearning: {
      findMany: jest.fn().mockResolvedValue([]),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    mockChat = {
      sendMessage: jest.fn().mockResolvedValue({
        response: { text: () => 'Chat Response' },
      }),
    };

    mockModel = {
      generateContent: jest.fn().mockResolvedValue({
        response: { text: () => '{"action": "INICIO", "identifier": "123"}' },
      }),
      startChat: jest.fn().mockReturnValue(mockChat),
    };

    mockGenAI = {
      getGenerativeModel: jest.fn().mockReturnValue(mockModel),
    };

    (GoogleGenerativeAI as any).mockImplementation(() => mockGenAI);
    process.env.API_KEY = 'test-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('interpretAudio', () => {
    it('should download audio and ask Gemini', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('audio-data'),
      });

      const result = await service.interpretAudio('http://audio.url');

      expect(axios.get).toHaveBeenCalledWith('http://audio.url', {
        responseType: 'arraybuffer',
      });
      expect(mockModel.generateContent).toHaveBeenCalled();
      expect(result.action).toBe('INICIO');
    });

    it('should handle axios errors', async () => {
      (axios.get as jest.Mock).mockRejectedValue(new Error('Download failed'));
      const result = await service.interpretAudio('http://audio.url');
      expect(result.action).toBe('UNKNOWN');
      expect(result.error).toBe('Falha no download do áudio');
    });
  });

  describe('interpretImage', () => {
    it('should download image and ask Gemini', async () => {
      (axios.get as jest.Mock).mockResolvedValue({
        data: Buffer.from('image-data'),
        headers: { 'content-type': 'image/png' },
      });

      const result = await service.interpretImage(
        'http://image.url',
        'Caption',
      );

      expect(axios.get).toHaveBeenCalledWith('http://image.url', {
        responseType: 'arraybuffer',
      });
      expect(mockModel.generateContent).toHaveBeenCalled();
      expect(result.action).toBe('INICIO');
    });
  });

  describe('processMessage', () => {
    it('should prioritize image over others', async () => {
      const spy = jest
        .spyOn(service, 'interpretImage')
        .mockResolvedValue({ action: 'IMAGE' });
      await service.processMessage('drv', 'text', 'img', 'aud');
      expect(spy).toHaveBeenCalled();
    });

    it('should prioritize audio over text', async () => {
      const spy = jest
        .spyOn(service, 'interpretAudio')
        .mockResolvedValue({ action: 'AUDIO' });
      await service.processMessage('drv', 'text', undefined, 'aud');
      expect(spy).toHaveBeenCalled();
    });

    it('should handle text if no media is present', async () => {
      const spy = jest
        .spyOn(service, 'interpretText')
        .mockResolvedValue({ action: 'TEXT' });
      await service.processMessage('drv', 'text');
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('askGemini (private logic via public methods)', () => {
    it('should include AI Learning context if available', async () => {
      mockPrismaService.aiLearning.findMany.mockResolvedValue([
        { phrase: 'x', intent: 'INICIO' },
      ]);

      await service.interpretText('test');

      const lastCall = mockModel.generateContent.mock.calls[0][0];
      expect(lastCall.contents[0].parts[0].text).toContain(
        'EXEMPLOS APRENDIDOS',
      );
    });

    it('should try secondary models if primary fails with 404', async () => {
      mockModel.generateContent
        .mockRejectedValueOnce({ status: 404 })
        .mockResolvedValueOnce({
          response: { text: () => '{"action": "OK"}' },
        });

      const result = await service.interpretText('test');

      expect(mockGenAI.getGenerativeModel).toHaveBeenCalledTimes(2);
      expect(result.action).toBe('OK');
    });

    it('should return UNKNOWN if all models fail', async () => {
      mockModel.generateContent.mockRejectedValue(new Error('Any error'));
      const result = await service.interpretText('test');
      expect(result.action).toBe('UNKNOWN');
    });
  });

  describe('chatWithLeonidas', () => {
    it('should start a chat and send a message', async () => {
      const result = await service.chatWithLeonidas('Hello', 'Global Context');

      expect(mockModel.startChat).toHaveBeenCalled();
      expect(mockChat.sendMessage).toHaveBeenCalledWith('Hello');
      expect(result).toBe('Chat Response');
    });

    it('should handle chat errors', async () => {
      mockChat.sendMessage.mockRejectedValue(new Error('Chat failed'));
      const result = await service.chatWithLeonidas('Hello');
      expect(result).toBe(
        'Desculpe, tive um problema momentâneo. Tente novamente.',
      );
    });
  });

  describe('analyzeDriverPerformance', () => {
    it('should generate performance analysis', async () => {
      mockModel.generateContent.mockResolvedValue({
        response: { text: () => 'Analysis text' },
      });

      const result = await service.analyzeDriverPerformance('John', {
        totalDeliveries: 10,
        successRate: 100,
        failedCount: 0,
        recentIssues: [],
      });

      expect(result).toBe('Analysis text');
      expect(mockModel.generateContent).toHaveBeenCalledWith(
        expect.stringContaining('John'),
      );
    });
  });
});
