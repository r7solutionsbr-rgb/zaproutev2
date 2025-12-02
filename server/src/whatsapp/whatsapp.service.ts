import { Injectable, Logger } from '@nestjs/common';
import { WhatsappProvider } from './providers/whatsapp-provider.interface';
import { ZapiProvider } from './providers/zapi.provider';
import { SendpulseProvider } from './providers/sendpulse.provider';

export interface ProviderConfig {
  type: 'ZAPI' | 'SENDPULSE';
  zapiInstanceId?: string;
  zapiToken?: string;
  zapiClientToken?: string;
  sendpulseClientId?: string;
  sendpulseClientSecret?: string;
  sendpulseBotId?: string; // NOVO
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  // Cache de providers para não instanciar toda vez (opcional, mas bom para SendPulse que tem token)
  private providers: Map<string, WhatsappProvider> = new Map();

  private getProvider(config: ProviderConfig): WhatsappProvider | null {
    // Chave única para cache baseada na config
    const key = config.type === 'ZAPI'
      ? `zapi_${config.zapiInstanceId}`
      : `sendpulse_${config.sendpulseClientId}`;

    if (this.providers.has(key)) {
      return this.providers.get(key)!;
    }

    let provider: WhatsappProvider | null = null;

    if (config.type === 'ZAPI') {
      if (config.zapiInstanceId && config.zapiToken) {
        provider = new ZapiProvider(
          config.zapiInstanceId,
          config.zapiToken,
          config.zapiClientToken,
        );
      }
    } else if (config.type === 'SENDPULSE') {
      if (config.sendpulseClientId && config.sendpulseClientSecret) {
        provider = new SendpulseProvider(
          config.sendpulseClientId,
          config.sendpulseClientSecret,
          config.sendpulseBotId // Passando o Bot ID
        );
      }
    }

    if (provider) {
      this.providers.set(key, provider);
    }

    return provider;
  }

  async sendText(phone: string, message: string, config?: ProviderConfig) {
    // Fallback para variáveis de ambiente globais se não vier config (retrocompatibilidade)
    const effectiveConfig: ProviderConfig = config || {
      type: 'ZAPI',
      zapiInstanceId: process.env.ZAPI_INSTANCE_ID,
      zapiToken: process.env.ZAPI_TOKEN,
      zapiClientToken: process.env.ZAPI_CLIENT_TOKEN,
    };

    this.logger.log(`📢 Solicitado envio de mensagem. Provider Config: ${effectiveConfig.type}`);

    const provider = this.getProvider(effectiveConfig);

    if (!provider) {
      this.logger.error(`❌ Erro: Nenhum provider configurado ou credenciais ausentes para ${effectiveConfig.type}`);
      return;
    }

    await provider.sendText(phone, message);
  }

  async sendTemplate(phone: string, template: string, variables: any[], config?: ProviderConfig) {
    const effectiveConfig: ProviderConfig = config || {
      type: 'ZAPI',
      zapiInstanceId: process.env.ZAPI_INSTANCE_ID,
      zapiToken: process.env.ZAPI_TOKEN,
      zapiClientToken: process.env.ZAPI_CLIENT_TOKEN,
    };

    this.logger.log(`📢 Solicitado envio de TEMPLATE (${template}). Provider: ${effectiveConfig.type}`);

    const provider = this.getProvider(effectiveConfig);

    if (!provider) {
      this.logger.error(`❌ Erro: Nenhum provider configurado para ${effectiveConfig.type}`);
      return;
    }

    await provider.sendTemplate(phone, template, variables);
  }
}