import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private instanceId = process.env.ZAPI_INSTANCE_ID;
  private token = process.env.ZAPI_TOKEN;
  private clientToken = process.env.ZAPI_CLIENT_TOKEN;
  private baseUrl = 'https://api.z-api.io/instances';

  async sendText(phone: string, message: string) {
    if (!this.instanceId || !this.token) {
      this.logger.warn('⚠️ Credenciais Z-API ausentes no .env');
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

      const response = await axios.post(url, {
        phone: cleanPhone,
        message: message
      }, config);

      this.logger.log(`✅ Resposta Z-API: ${JSON.stringify(response.data)}`);

    } catch (error: any) {
      const errorData = error.response ? JSON.stringify(error.response.data) : error.message;
      this.logger.error(`❌ FALHA Z-API: ${errorData}`);
    }
  }
}