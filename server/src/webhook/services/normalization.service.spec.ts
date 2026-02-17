import { Test, TestingModule } from '@nestjs/testing';
import { NormalizationService } from './normalization.service';
import { MessageType } from '../dto/incoming-message.dto';

describe('NormalizationService', () => {
  let service: NormalizationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NormalizationService],
    }).compile();

    service = module.get<NormalizationService>(NormalizationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('normalize (SendPulse)', () => {
    it('should normalize a text message', () => {
      const payload = {
        service: 'whatsapp',
        title: 'incoming_message',
        contact: { phone: '5511999999999' },
        info: {
          message: {
            channel_data: {
              message: {
                type: 'text',
                text: { body: 'Hello' },
              },
            },
          },
        },
      };

      const result = service.normalize('SENDPULSE', payload);

      expect(result).toBeDefined();
      expect(result?.provider).toBe('SENDPULSE');
      expect(result?.rawPhone).toBe('5511999999999');
      expect(result?.type).toBe(MessageType.TEXT);
      expect(result?.payload.text).toBe('Hello');
    });

    it('should return null for non-whatsapp service', () => {
      const payload = { service: 'telegram', title: 'incoming_message' };
      const result = service.normalize('SENDPULSE', payload);
      expect(result).toBeNull();
    });

    it('should normalize an image message', () => {
      const payload = {
        service: 'whatsapp',
        title: 'incoming_message',
        contact: { phone: '5511999999999' },
        info: {
          message: {
            channel_data: {
              message: {
                type: 'image',
                image: { url: 'http://image.url', caption: 'Nice image' },
              },
            },
          },
        },
      };

      const result = service.normalize('SENDPULSE', payload);

      expect(result?.type).toBe(MessageType.IMAGE);
      expect(result?.payload.url).toBe('http://image.url');
      expect(result?.payload.caption).toBe('Nice image');
    });

    it('should normalize an audio message', () => {
      const payload = {
        service: 'whatsapp',
        title: 'incoming_message',
        contact: { phone: '5511999999999' },
        info: {
          message: {
            channel_data: {
              message: {
                type: 'audio',
                audio: { url: 'http://audio.url' },
              },
            },
          },
        },
      };

      const result = service.normalize('SENDPULSE', payload);

      expect(result?.type).toBe(MessageType.AUDIO);
      expect(result?.payload.url).toBe('http://audio.url');
    });

    it('should normalize a location message', () => {
      const payload = {
        service: 'whatsapp',
        title: 'incoming_message',
        contact: { phone: '5511999999999' },
        info: {
          message: {
            channel_data: {
              message: {
                type: 'location',
                location: { latitude: -23.5, longitude: -46.6 },
              },
            },
          },
        },
      };

      const result = service.normalize('SENDPULSE', payload);

      expect(result?.type).toBe(MessageType.LOCATION);
      expect(result?.payload.latitude).toBe(-23.5);
      expect(result?.payload.longitude).toBe(-46.6);
    });
  });

  describe('normalize (Z-API)', () => {
    it('should normalize a text message', () => {
      const payload = {
        phone: '5511999999999',
        text: { message: 'Hello Z-API' },
      };

      const result = service.normalize('ZAPI', payload);

      expect(result?.provider).toBe('ZAPI');
      expect(result?.rawPhone).toBe('5511999999999');
      expect(result?.type).toBe(MessageType.TEXT);
      expect(result?.payload.text).toBe('Hello Z-API');
    });

    it('should normalize an audio message', () => {
      const payload = {
        phone: '5511999999999',
        audio: { audioUrl: 'http://zapi-audio.url' },
      };

      const result = service.normalize('ZAPI', payload);

      expect(result?.type).toBe(MessageType.AUDIO);
      expect(result?.payload.url).toBe('http://zapi-audio.url');
    });

    it('should normalize an image message', () => {
      const payload = {
        phone: '5511999999999',
        image: { imageUrl: 'http://zapi-image.url', caption: 'Z-API Cap' },
      };

      const result = service.normalize('ZAPI', payload);

      expect(result?.type).toBe(MessageType.IMAGE);
      expect(result?.payload.url).toBe('http://zapi-image.url');
      expect(result?.payload.caption).toBe('Z-API Cap');
    });

    it('should normalize a location message', () => {
      const payload = {
        phone: '5511999999999',
        location: { latitude: -20, longitude: -40 },
      };

      const result = service.normalize('ZAPI', payload);

      expect(result?.type).toBe(MessageType.LOCATION);
      expect(result?.payload.latitude).toBe(-20);
      expect(result?.payload.longitude).toBe(-40);
    });

    it('should normalize a Cloud API format (Meta) message', () => {
      const payload = {
        object: 'whatsapp_business_account',
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: '5511888888888',
                      type: 'text',
                      text: { body: 'Cloud API Msg' },
                    },
                  ],
                },
              },
            ],
          },
        ],
      };

      const result = service.normalize('ZAPI', payload);

      expect(result?.rawPhone).toBe('5511888888888');
      expect(result?.type).toBe(MessageType.TEXT);
      expect(result?.payload.text).toBe('Cloud API Msg');
    });
  });

  describe('error handling', () => {
    it('should return null and log error if payload is invalid', () => {
      const result = service.normalize('ZAPI', null);
      expect(result).toBeNull();
    });
  });
});
