import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import axios from 'axios';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);
  private token: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.initTransport();
  }

  private async initTransport() {
    // Se tivermos credenciais de API do SendPulse, usamos o modo HTTP
    if (
      process.env.SENDPULSE_CLIENT_ID &&
      process.env.SENDPULSE_CLIENT_SECRET
    ) {
      this.logger.log('🚀 Modo de Envio: SendPulse HTTP API (Port 443)');
    } else if (process.env.SMTP_HOST) {
      // Fallback para SMTP (se configurado, mas sem API)
      this.logger.warn(
        '⚠️ Modo de Envio: SMTP (Pode ser bloqueado em produção)',
      );
      this.setupSmtp();
    } else {
      // Modo Desenvolvimento (Ethereal)
      this.setupEthereal();
    }
  }

  private setupSmtp() {
    const host = process.env.SMTP_HOST;
    const port = Number(process.env.SMTP_PORT) || 2525;
    const secure =
      process.env.SMTP_SECURE !== undefined
        ? process.env.SMTP_SECURE === 'true'
        : port === 465;

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: {
        rejectUnauthorized: process.env.SMTP_IGNORE_TLS !== 'true',
      },
      family: 4,
      connectionTimeout: 60000,
    } as any);
  }

  private async setupEthereal() {
    const testAccount = await nodemailer.createTestAccount();
    this.transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    this.logger.warn('⚠️ Usando E-mail de Teste (Ethereal).');
    this.logger.log(`🔗 Preview URL: As URLs aparecerão no console.`);
  }

  private async getSendPulseToken(): Promise<string> {
    if (this.token && Date.now() < this.tokenExpiresAt) {
      return this.token;
    }

    try {
      const response = await axios.post(
        'https://api.sendpulse.com/oauth/access_token',
        {
          grant_type: 'client_credentials',
          client_id: process.env.SENDPULSE_CLIENT_ID,
          client_secret: process.env.SENDPULSE_CLIENT_SECRET,
        },
      );

      this.token = response.data.access_token;
      // Expira em (expires_in - 60) segundos para margem de segurança
      this.tokenExpiresAt = Date.now() + (response.data.expires_in - 60) * 1000;
      return this.token;
    } catch (error) {
      this.logger.error(
        '❌ Erro ao autenticar no SendPulse API:',
        error.message,
      );
      throw error;
    }
  }

  private async sendEmail(to: string, subject: string, html: string) {
    // 1. Tenta via API HTTP (Prioridade)
    if (
      process.env.SENDPULSE_CLIENT_ID &&
      process.env.SENDPULSE_CLIENT_SECRET
    ) {
      try {
        const token = await this.getSendPulseToken();

        let fromName = process.env.EMAIL_FROM_NAME || 'ZapRoute';
        let fromEmail =
          process.env.EMAIL_FROM_ADDRESS || 'suporte@zaproute.com.br';

        // Tenta extrair do EMAIL_FROM se as variáveis específicas não existirem
        // Formato esperado: "Nome" <email@dominio.com>
        if (
          process.env.EMAIL_FROM &&
          (!process.env.EMAIL_FROM_NAME || !process.env.EMAIL_FROM_ADDRESS)
        ) {
          const match = process.env.EMAIL_FROM.match(
            /["']?([^"']*)["']?\s*<([^>]*)>/,
          );
          if (match) {
            fromName = match[1].trim();
            fromEmail = match[2].trim();
          }
        }

        // SendPulse API expects base64 for HTML content
        const htmlBase64 = Buffer.from(html).toString('base64');

        const payload = {
          email: {
            html: htmlBase64,
            text: 'Visualize este e-mail em um navegador.',
            subject,
            from: {
              name: fromName,
              email: fromEmail,
            },
            to: [
              {
                email: to,
              },
            ],
          },
        };

        const response = await axios.post(
          'https://api.sendpulse.com/smtp/emails',
          payload,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        this.logger.log(
          `📧 E-mail enviado via HTTP API para ${to} | ID: ${response.data.id || 'OK'}`,
        );
        return response.data;
      } catch (error) {
        this.logger.error(
          `❌ Falha no envio via API HTTP: ${error.response?.data?.message || error.message}`,
        );
        // Se falhar API, tenta fallback para SMTP se configurado?
        // Por enquanto, apenas lança erro para não mascarar problemas.
        throw error;
      }
    }

    // 2. Fallback para Nodemailer (SMTP ou Ethereal)
    if (this.transporter) {
      const info = await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || '"ZapRoute" <noreply@zaproute.com>',
        to,
        subject,
        html,
      });

      this.logger.log(
        `📧 E-mail enviado via SMTP para ${to} | ID: ${info.messageId}`,
      );

      if (nodemailer.getTestMessageUrl(info)) {
        this.logger.log(
          `📬 [PREVIEW] Veja o e-mail aqui: ${nodemailer.getTestMessageUrl(info)}`,
        );
      }
      return info;
    }

    this.logger.error(
      '❌ Nenhum método de envio configurado (Sem API Key e sem SMTP).',
    );
    throw new Error('Email configuration missing');
  }

  async sendForgotPassEmail(to: string, token: string) {
    const resetLink = `http://localhost:5173/reset-password?token=${token}`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2>Recuperação de Senha</h2>
            <p>Você solicitou a redefinição de sua senha.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Redefinir Minha Senha</a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Se você não solicitou isso, ignore este e-mail.</p>
        </div>
      `;

    await this.sendEmail(to, 'Recuperação de Senha - ZapRoute', html);
  }

  async sendWelcomeEmail(to: string, name: string, pass: string) {
    const loginLink = `http://localhost:5173/login`;
    const html = `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2563eb;">Bem-vindo ao ZapRoute, ${name}!</h2>
            <p>Sua conta foi criada com sucesso. Abaixo estão suas credenciais de acesso:</p>
            
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <p style="margin: 5px 0;"><strong>E-mail:</strong> ${to}</p>
                <p style="margin: 5px 0;"><strong>Senha Temporária:</strong> ${pass}</p>
            </div>

            <p>Recomendamos que você altere sua senha após o primeiro acesso.</p>

            <a href="${loginLink}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Acessar Plataforma</a>
            
            <p style="margin-top: 30px; font-size: 12px; color: #666; border-top: 1px solid #eee; padding-top: 10px;">
                Se tiver dúvidas, entre em contato com nosso suporte.
            </p>
        </div>
      `;

    await this.sendEmail(to, 'Bem-vindo ao ZapRoute! 🚀', html);
  }
}
