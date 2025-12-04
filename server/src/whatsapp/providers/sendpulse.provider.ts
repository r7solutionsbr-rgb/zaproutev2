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
        private botId?: string, // Opcional: Pode vir do .env se não passado
    ) { }

    // --- AUTENTICAÇÃO OAUTH2 (SendPulse requer isso) ---
    private async authenticate(): Promise<void> {
        const now = Date.now();
        // Reutiliza token se ainda for válido (com margem de 60s)
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
            // Define expiração (expires_in vem em segundos, convertemos para ms)
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

    // --- RESOLUÇÃO DE CONTATO (SendPulse precisa de contact_id para alguns envios) ---
    private async resolveContactId(phone: string, botId: string): Promise<string | null> {
        // 1. Tentar BUSCAR (GetByPhone)
        try {
            const response = await axios.get(`${this.baseUrl}/whatsapp/contacts/getByPhone`, {
                params: { phone, bot_id: botId },
                headers: { Authorization: `Bearer ${this.accessToken}` }
            });

            if (response.data && response.data.data && response.data.data.length > 0) {
                // SendPulse retorna array, pegamos o primeiro
                const contact = response.data.data[0];
                this.logger.log(`✅ Contato encontrado: ${contact.id}`);
                return contact.id;
            }
        } catch (error: any) {
            // Ignora erro 404 (não encontrado) para tentar criar
            if (error.response?.status !== 404) {
                this.logger.warn(`⚠️ Falha ao buscar contato: ${error.message}`);
            }
        }

        // 2. Se não achar, tentar CRIAR (Create)
        try {
            this.logger.log(`Mw Criando contato para ${phone}...`);
            const response = await axios.post(
                `${this.baseUrl}/whatsapp/contacts`,
                { phone, bot_id: botId },
                { headers: { Authorization: `Bearer ${this.accessToken}` } }
            );

            if (response.data && response.data.data && response.data.data.id) {
                this.logger.log(`✅ Contato criado: ${response.data.data.id}`);
                return response.data.data.id;
            }
        } catch (error: any) {
            this.logger.warn(`⚠️ Falha ao criar contato: ${error.message}`);
        }

        return null;
    }

    private getBotId(): string | undefined {
        return this.botId || process.env.SENDPULSE_BOT_ID;
    }

    // --- IMPLEMENTAÇÃO DA INTERFACE ---

    async sendText(phone: string, message: string): Promise<void> {
        if (!this.clientId || !this.clientSecret) {
            this.logger.warn('⚠️ Credenciais SendPulse ausentes');
            return;
        }

        const botId = this.getBotId();
        if (!botId) {
            this.logger.error('❌ ERRO CRÍTICO: SENDPULSE_BOT_ID não configurado');
            return;
        }

        try {
            await this.authenticate();

            // Formatação: SendPulse espera E.164 sem o '+' (ex: 5511999998888)
            let cleanPhone = phone.replace(/\D/g, '');
            if (cleanPhone.length === 10 || cleanPhone.length === 11) {
                cleanPhone = '55' + cleanPhone;
            }

            const url = `${this.baseUrl}/whatsapp/contacts/send`;

            // Monta payload básico (envio por telefone direto é suportado em algumas versões da API)
            const payload: any = {
                bot_id: botId,
                phone: cleanPhone,
                message: { type: 'text', text: { body: message } }
            };

            this.logger.log(`📡 Enviando texto SendPulse para ${cleanPhone}...`);

            const response = await axios.post(url, payload, {
                headers: { Authorization: `Bearer ${this.accessToken}` },
            });

            this.logger.log(`✅ Resposta SendPulse: ${JSON.stringify(response.data)}`);
        } catch (error: any) {
            const errorData = error.response ? JSON.stringify(error.response.data) : error.message;
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

            const url = `${this.baseUrl}/whatsapp/contacts/send`;

            // Mapeia variáveis (array de strings) para componentes do template
            // Nota: SendPulse pode exigir estrutura específica dependendo do template criado lá
            const parameters = variables.map(v => ({
                type: 'text',
                text: String(v)
            }));

            const payload: any = {
                bot_id: botId,
                phone: cleanPhone,
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

            this.logger.log(`📡 Enviando Template SendPulse: ${templateName}`);
            const response = await axios.post(url, payload, {
                headers: { Authorization: `Bearer ${this.accessToken}` }
            });
            this.logger.log(`✅ Template Enviado: ${JSON.stringify(response.data)}`);

        } catch (error: any) {
            const errorData = error.response ? JSON.stringify(error.response.data) : error.message;
            this.logger.error(`❌ FALHA Template SendPulse: ${errorData}`);
        }
    }

    // --- MÉTODOS NÃO IMPLEMENTADOS (Placeholder) ---
    // SendPulse tem suporte a mídia, mas a implementação é complexa (upload prévio).
    // Para este MVP, deixamos apenas o log para não quebrar a interface.

    async sendImage(to: string, url: string, caption?: string): Promise<void> {
        this.logger.warn('⚠️ SendPulse: sendImage não implementado neste provider ainda.');
        await this.sendText(to, `[Imagem não enviada]: ${caption || ''} ${url}`);
    }

    async sendAudio(to: string, url: string): Promise<void> {
        this.logger.warn('⚠️ SendPulse: sendAudio não implementado neste provider ainda.');
    }

    async sendLocation(to: string, lat: number, lng: number, title?: string, address?: string): Promise<void> {
        this.logger.warn('⚠️ SendPulse: sendLocation não implementado neste provider ainda.');
        await this.sendText(to, `[Localização]: ${title} - ${address} (${lat}, ${lng})`);
    }

    async sendLink(to: string, linkUrl: string, title?: string): Promise<void> {
        // Fallback simples: Enviar o link como texto
        await this.sendText(to, `${title ? title + ': ' : ''}${linkUrl}`);
    }

    // Implementação do método obrigatório sendButtons
    async sendButtons(to: string, title: string, footer: string, buttons: { id: string; label: string }[]): Promise<void> {
        // O SendPulse tem uma API de botões diferente e complexa (flows).
        // Para manter a compatibilidade rápida com a interface, usamos um fallback de texto.

        this.logger.log(`[SendPulse] Solicitado envio de botões para ${to}. Usando fallback de texto.`);

        const options = buttons.map(b => `[${b.label}]`).join(' ou ');
        const textMessage = `${title}\n\n(Responda com: ${options})`;

        await this.sendText(to, textMessage);
    }
}