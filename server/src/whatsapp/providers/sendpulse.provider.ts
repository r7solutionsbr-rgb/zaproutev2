import { Logger } from '@nestjs/common';
import axios from 'axios';
import { WhatsappProvider } from './whatsapp-provider.interface';

export class SendpulseProvider implements WhatsappProvider {
    private readonly logger = new Logger(SendpulseProvider.name);
    private baseUrl = 'https://api.sendpulse.com';
    private accessToken: string | null = null;
    private tokenExpiration: number = 0;

    constructor(
        private clientId: string,
        private clientSecret: string,
        private botId?: string, // Opcional para manter compatibilidade se não passar
    ) { }

    private async authenticate(): Promise<void> {
        const now = Date.now();
        if (this.accessToken && now < this.tokenExpiration) {
            return;
        }

        try {
            this.logger.log('🔐 Autenticando SendPulse...');
            const response = await axios.post(`${this.baseUrl}/oauth/access_token`, {
                grant_type: 'client_credentials',
                client_id: this.clientId,
                client_secret: this.clientSecret,
            });

            this.accessToken = response.data.access_token;
            this.tokenExpiration = now + (response.data.expires_in - 60) * 1000;
            this.logger.log('✅ SendPulse autenticado com sucesso.');
        } catch (error: any) {
            this.logger.error(
                `❌ Falha na autenticação SendPulse: ${error.message}`,
                error.response?.data,
            );
            throw error;
        }
    }

    private async resolveContactId(phone: string, botId: string): Promise<string | null> {
        // 1. Tentar CRIAR o contato (Upsert)
        // Endpoint: POST /whatsapp/contacts
        // Isso geralmente retorna o ID se criado ou se já existe
        try {
            this.logger.log(`🔍 Tentando criar/recuperar contato para ${phone}...`);
            const response = await axios.post(
                `${this.baseUrl}/whatsapp/contacts`,
                { phone, bot_id: botId },
                { headers: { Authorization: `Bearer ${this.accessToken}` } }
            );

            if (response.data && response.data.data && response.data.data.id) {
                this.logger.log(`✅ Contato resolvido via Criação: ${response.data.data.id}`);
                return response.data.data.id;
            }
        } catch (error: any) {
            this.logger.warn(`⚠️ Falha ao criar contato: ${error.message}. Tentando busca...`);
        }

        // 2. Se falhar, tentar BUSCAR (GetByPhone)
        // Endpoint: GET /whatsapp/contacts/getByPhone
        try {
            const response = await axios.get(`${this.baseUrl}/whatsapp/contacts/getByPhone`, {
                params: { phone, bot_id: botId },
                headers: { Authorization: `Bearer ${this.accessToken}` }
            });

            if (response.data && response.data.data && response.data.data.id) {
                this.logger.log(`✅ Contato resolvido via Busca: ${response.data.data.id}`);
                return response.data.data.id;
            }
        } catch (error: any) {
            this.logger.warn(`⚠️ Falha ao buscar contato: ${error.message}`);
        }

        return null;
    }

    private getBotId(): string | undefined {
        return this.botId || process.env.SENDPULSE_BOT_ID;
    }

    async sendText(phone: string, message: string): Promise<void> {
        if (!this.clientId || !this.clientSecret) {
            this.logger.warn('⚠️ Credenciais SendPulse ausentes');
            return;
        }

        const botId = this.getBotId();
        if (!botId) {
            this.logger.error('❌ ERRO CRÍTICO: SENDPULSE_BOT_ID não configurado (nem no construtor nem no .env)');
            return;
        }

        try {
            await this.authenticate();

            // Formatação E.164 (SEM O + para SendPulse, pois o webhook vem sem)
            let cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                cleanPhone = '55' + cleanPhone;
            }
            const finalPhone = cleanPhone;

            // Resolver ID do Contato
            const contactId = await this.resolveContactId(finalPhone, botId);

            if (!contactId) {
                this.logger.error(`❌ Não foi possível obter o contact_id para ${finalPhone}. O envio falhará.`);
            }

            const url = `${this.baseUrl}/whatsapp/contacts/send`;
            const payload: any = {
                bot_id: botId,
                message: { type: 'text', text: { body: message } }
            };

            if (contactId) {
                payload.contact_id = contactId;
            } else {
                payload.phone = finalPhone;
            }

            this.logger.log(`📡 Payload Final: ${JSON.stringify(payload)}`);

            const response = await axios.post(
                url,
                payload,
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                    },
                },
            );

            this.logger.log(`✅ Resposta SendPulse: ${JSON.stringify(response.data)}`);
        } catch (error: any) {
            const errorData = error.response
                ? JSON.stringify(error.response.data)
                : error.message;
            this.logger.error(`❌ FALHA SendPulse: ${errorData}`);
        }
    }

    async sendTemplate(to: string, templateName: string, variables: any[]): Promise<void> {
        if (!this.clientId || !this.clientSecret) return;

        const botId = this.getBotId();
        if (!botId) {
            this.logger.error('❌ ERRO CRÍTICO: Bot ID não configurado para Template');
            return;
        }

        try {
            await this.authenticate();

            let cleanPhone = to.replace(/\D/g, '');
            if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                cleanPhone = '55' + cleanPhone;
            }

            // Para templates, SendPulse exige contact_id ou phone.
            // Vamos tentar resolver o contact_id primeiro.
            const contactId = await this.resolveContactId(cleanPhone, botId);

            const url = `${this.baseUrl}/whatsapp/contacts/send`;

            // Mapeando variáveis para o formato de componentes do WhatsApp
            // SendPulse espera algo como:
            // "message": {
            //   "type": "template",
            //   "template": {
            //      "name": "template_name",
            //      "language": { "code": "pt_BR" },
            //      "components": [ { "type": "body", "parameters": [ ... ] } ]
            //   }
            // }

            const parameters = variables.map(v => ({
                type: 'text',
                text: String(v)
            }));

            const payload: any = {
                bot_id: botId,
                message: {
                    type: 'template',
                    template: {
                        name: templateName,
                        language: { code: 'pt_BR' },
                        components: [
                            {
                                type: 'body',
                                parameters: parameters
                            }
                        ]
                    }
                }
            };

            if (contactId) {
                payload.contact_id = contactId;
            } else {
                payload.phone = cleanPhone;
            }

            this.logger.log(`📡 Enviando Template SendPulse: ${templateName} para ${cleanPhone}`);

            const response = await axios.post(url, payload, {
                headers: { Authorization: `Bearer ${this.accessToken}` }
            });

            this.logger.log(`✅ Template Enviado: ${JSON.stringify(response.data)}`);

        } catch (error: any) {
            const errorData = error.response
                ? JSON.stringify(error.response.data)
                : error.message;
            this.logger.error(`❌ FALHA Template SendPulse: ${errorData}`);
        }
    }

    async sendImage(to: string, url: string, caption?: string): Promise<void> {
        this.logger.warn('⚠️ SendPulse: sendImage não implementado ainda.');
    }

    async sendAudio(to: string, url: string): Promise<void> {
        this.logger.warn('⚠️ SendPulse: sendAudio não implementado ainda.');
    }

    async sendLocation(to: string, lat: number, lng: number, title?: string, address?: string): Promise<void> {
        this.logger.warn('⚠️ SendPulse: sendLocation não implementado ainda.');
    }

    async sendLink(to: string, linkUrl: string, title?: string): Promise<void> {
        // Fallback: Enviar como texto
        await this.sendText(to, `${title ? title + ': ' : ''}${linkUrl}`);
    }
}
