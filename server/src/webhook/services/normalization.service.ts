
import { Injectable, Logger } from '@nestjs/common';
import { IncomingMessage, MessageType } from '../dto/incoming-message.dto';

@Injectable()
export class NormalizationService {
    private readonly logger = new Logger(NormalizationService.name);

    normalize(provider: 'ZAPI' | 'SENDPULSE', payload: any): IncomingMessage | null {
        try {
            if (provider === 'SENDPULSE') {
                return this.normalizeSendPulse(payload);
            } else {
                return this.normalizeZApi(payload);
            }
        } catch (error) {
            this.logger.error(`Erro ao normalizar mensagem do ${provider}: ${error.message}`);
            return null;
        }
    }

    private normalizeSendPulse(event: any): IncomingMessage | null {
        if (event.service !== 'whatsapp' || event.title !== 'incoming_message') return null;

        const rawPhone = event.contact?.phone;
        const msgData = event.info?.message?.channel_data?.message;
        const type = msgData?.type;

        if (!rawPhone || !type) return null;

        const message = new IncomingMessage();
        message.provider = 'SENDPULSE';
        message.rawPhone = rawPhone;
        message.payload = {};

        switch (type) {
            case 'text':
                message.type = MessageType.TEXT;
                message.payload.text = msgData.text.body;
                break;
            case 'image':
                message.type = MessageType.IMAGE;
                message.payload.url = msgData.image.url;
                message.payload.caption = msgData.image.caption;
                break;
            case 'audio':
            case 'voice':
                message.type = MessageType.AUDIO;
                message.payload.url = msgData.audio?.url || msgData.voice?.url;
                break;
            case 'location':
                message.type = MessageType.LOCATION;
                message.payload.latitude = msgData.location.latitude;
                message.payload.longitude = msgData.location.longitude;
                break;
            default:
                message.type = MessageType.UNKNOWN;
        }

        return message;
    }

    private normalizeZApi(payload: any): IncomingMessage | null {
        // Lógica extraída do WebhookService original
        let rawPhone = '';
        let type = MessageType.UNKNOWN;
        const data: any = {};

        if (payload.phone) {
            // Formato Z-API Padrão
            rawPhone = payload.phone;
            if (payload.text?.message) {
                type = MessageType.TEXT;
                data.text = payload.text.message;
            } else if (payload.audio?.audioUrl) {
                type = MessageType.AUDIO;
                data.url = payload.audio.audioUrl;
            } else if (payload.image?.imageUrl) {
                type = MessageType.IMAGE;
                data.url = payload.image.imageUrl;
                data.caption = payload.image.caption;
            } else if (payload.location) {
                type = MessageType.LOCATION;
                data.latitude = payload.location.latitude;
                data.longitude = payload.location.longitude;
            }
        } else if (payload.object === 'whatsapp_business_account') {
            // Formato Cloud API (Meta) - às vezes passado via Z-API
            const msg = payload.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
            if (msg) {
                rawPhone = msg.from;
                if (msg.type === 'text') {
                    type = MessageType.TEXT;
                    data.text = msg.text.body;
                }
                // Adicionar outros tipos se necessário
            }
        }

        if (!rawPhone || type === MessageType.UNKNOWN) return null;

        const message = new IncomingMessage();
        message.provider = 'ZAPI';
        message.rawPhone = rawPhone;
        message.type = type;
        message.payload = data;

        return message;
    }
}
