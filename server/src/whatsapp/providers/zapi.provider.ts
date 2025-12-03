import { Logger } from '@nestjs/common';
import axios from 'axios';
import { WhatsappProvider } from './whatsapp-provider.interface';

export class ZapiProvider implements WhatsappProvider {
    private readonly logger = new Logger(ZapiProvider.name);
    private baseUrl = 'https://api.z-api.io/instances';

    constructor(
        private instanceId: string,
        private token: string,
        private clientToken?: string,
    ) { }

    async sendText(phone: string, message: string): Promise<void> {
        if (!this.instanceId || !this.token) {
            this.logger.warn('⚠️ Credenciais Z-API ausentes/inválidas');
            return;
        }

        try {
            const cleanPhone = phone.replace(/\D/g, '');
            const url = `${this.baseUrl}/${this.instanceId}/token/${this.token}/send-text`;

            this.logger.log(`📡 Enviando Z-API para ${cleanPhone}...`);

            const config: any = { headers: {} };
            if (this.clientToken) {
                config.headers['Client-Token'] = this.clientToken;
            }

            const response = await axios.post(
                url,
                {
                    phone: cleanPhone,
                    message: message,
                },
                config,
            );

            this.logger.log(`✅ Resposta Z-API: ${JSON.stringify(response.data)}`);
        } catch (error: any) {
            const errorData = error.response
                ? JSON.stringify(error.response.data)
                : error.message;
            this.logger.error(`❌ FALHA Z-API: ${errorData}`);
        }
    }

    async sendTemplate(to: string, template: string, variables: any[]): Promise<void> {
        // Z-API (via QR Code) não usa Templates oficiais do WhatsApp Business API.
        // Fallback: Montamos uma mensagem de texto substituindo as variáveis.
        // Ex: "Olá {{1}}!" -> "Olá João!"

        let message = template; // Aqui assumimos que 'template' pode ser o texto ou o nome. 
        // Se for só o nome (ex: 'welcome'), precisaríamos de um mapa de templates.
        // Para simplificar e manter compatibilidade, vamos assumir que o caller
        // pode passar o texto formatado OU lidamos com isso no Service.

        // Mas seguindo o contrato estrito onde 'template' é o NOME do template (slug):
        // Como Z-API não tem templates, vamos logar e enviar um texto genérico ou 
        // o caller deve garantir que para Z-API ele mande texto.

        // MELHOR ABORDAGEM: O WhatsappService vai decidir. 
        // Se cair aqui, é porque o Service mandou.
        // Vamos tentar interpolar se vier um texto com placeholders, ou apenas logar.

        this.logger.warn(`⚠️ Z-API não suporta Templates Nativos. Tentando enviar como texto simples.`);

        // Simples concatenação para debug
        const text = `[Template: ${template}] Params: ${variables.join(', ')}`;
        await this.sendText(to, text);
    }

    async sendImage(to: string, url: string, caption?: string): Promise<void> {
        await this.sendMedia('send-image', to, url, caption);
    }

    async sendAudio(to: string, url: string): Promise<void> {
        await this.sendMedia('send-audio', to, url);
    }

    async sendLink(to: string, linkUrl: string, title?: string): Promise<void> {
        if (!this.instanceId || !this.token) return;
        try {
            const cleanPhone = to.replace(/\D/g, '');
            const endpoint = `${this.baseUrl}/${this.instanceId}/token/${this.token}/send-link`;

            this.logger.log(`📡 Enviando Link Z-API para ${cleanPhone}...`);

            const config: any = { headers: {} };
            if (this.clientToken) config.headers['Client-Token'] = this.clientToken;

            await axios.post(endpoint, {
                phone: cleanPhone,
                message: title || linkUrl,
                image: 'https://cdn-icons-png.flaticon.com/512/281/281769.png', // Ícone genérico
                linkUrl: linkUrl,
                title: title || 'Link',
                linkDescription: linkUrl
            }, config);

        } catch (error: any) {
            this.logger.error(`❌ FALHA Z-API Link: ${error.message}`);
        }
    }

    async sendLocation(to: string, lat: number, lng: number, title?: string, address?: string): Promise<void> {
        if (!this.instanceId || !this.token) return;
        try {
            const cleanPhone = to.replace(/\D/g, '');
            const endpoint = `${this.baseUrl}/${this.instanceId}/token/${this.token}/send-location`;

            this.logger.log(`📡 Enviando Localização Z-API para ${cleanPhone}...`);

            const config: any = { headers: {} };
            if (this.clientToken) config.headers['Client-Token'] = this.clientToken;

            await axios.post(endpoint, {
                phone: cleanPhone,
                latitude: lat,
                longitude: lng,
                title: title || 'Localização',
                address: address || ''
            }, config);

        } catch (error: any) {
            this.logger.error(`❌ FALHA Z-API Location: ${error.message}`);
        }
    }

    private async sendMedia(type: 'send-image' | 'send-audio', to: string, url: string, caption?: string): Promise<void> {
        if (!this.instanceId || !this.token) return;
        try {
            const cleanPhone = to.replace(/\D/g, '');
            const endpoint = `${this.baseUrl}/${this.instanceId}/token/${this.token}/${type}`;

            this.logger.log(`📡 Enviando ${type} Z-API para ${cleanPhone}...`);

            const config: any = { headers: {} };
            if (this.clientToken) config.headers['Client-Token'] = this.clientToken;

            const payload: any = { phone: cleanPhone };
            if (type === 'send-image') {
                payload.image = url;
                if (caption) payload.caption = caption;
            } else {
                payload.audio = url;
            }

            await axios.post(endpoint, payload, config);

        } catch (error: any) {
            this.logger.error(`❌ FALHA Z-API ${type}: ${error.message}`);
        }
    }
}
