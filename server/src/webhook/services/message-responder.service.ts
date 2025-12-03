import { Injectable, Logger } from '@nestjs/common';
import { WhatsappService, ProviderConfig } from '../../whatsapp/whatsapp.service';

@Injectable()
export class MessageResponder {
    private readonly logger = new Logger(MessageResponder.name);

    constructor(private whatsapp: WhatsappService) { }

    private getWhatsappConfig(tenant: any): ProviderConfig {
        const providerType = tenant.config?.whatsappProvider || 'ZAPI';

        if (providerType === 'SENDPULSE') {
            return {
                type: 'SENDPULSE',
                sendpulseClientId: process.env.SENDPULSE_ID,
                sendpulseClientSecret: process.env.SENDPULSE_SECRET,
                sendpulseBotId: tenant.config?.whatsappProvider?.sendpulseBotId || process.env.SENDPULSE_BOT_ID
            };
        }

        return {
            type: 'ZAPI',
            zapiInstanceId: tenant.config?.whatsappProvider?.zapiInstanceId || process.env.ZAPI_INSTANCE_ID,
            zapiToken: tenant.config?.whatsappProvider?.zapiToken || process.env.ZAPI_TOKEN,
            zapiClientToken: tenant.config?.whatsappProvider?.zapiClientToken || process.env.ZAPI_CLIENT_TOKEN
        };
    }

    async send(to: string, message: string, tenant: any) {
        const config = this.getWhatsappConfig(tenant);
        this.logger.log(`🤖 Respondendo via ${config.type} para ${to}`);
        await this.whatsapp.sendText(to, message, config);
    }

    getGreeting(): string {
        const hour = parseInt(new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: 'numeric', hour12: false }));
        if (hour < 12) return 'Bom dia';
        if (hour < 18) return 'Boa tarde';
        return 'Boa noite';
    }
}
