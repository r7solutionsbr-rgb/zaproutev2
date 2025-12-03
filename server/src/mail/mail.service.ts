import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailService.name);

  constructor() {
    this.initTransport();
  }

  private async initTransport() {
    // Verifica se temos credenciais reais ou usamos Ethereal (Teste)
    if (process.env.SMTP_HOST) {
      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT) || 587;
      const user = process.env.SMTP_USER;

      // Lógica inteligente para 'secure':
      // Se SMTP_SECURE estiver definido, usa o valor.
      // Se não, assume true para porta 465 e false para outras (587, 25).
      const secure = process.env.SMTP_SECURE !== undefined
        ? process.env.SMTP_SECURE === 'true'
        : port === 465;

      this.logger.log(`🔧 Configurando SMTP: Host=${host}, Port=${port}, Secure=${secure}, User=${user ? '***' : 'MISSING'}`);

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          rejectUnauthorized: process.env.SMTP_IGNORE_TLS !== 'true',
        },
        // Aumenta timeout para 30s (Railway pode ser lento às vezes)
        connectionTimeout: 30000,
        greetingTimeout: 30000,
        socketTimeout: 30000,
      });

      // Verifica conexão
      try {
        await this.transporter.verify();
        this.logger.log('✅ SMTP Conectado com sucesso!');
      } catch (error) {
        this.logger.error(`❌ Erro ao conectar SMTP: ${error.message}`, error.stack);
      }

    } else {
      // Cria conta de teste (Ethereal) automaticamente para DEV
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
      this.logger.warn('⚠️ Usando E-mail de Teste (Ethereal). As mensagens não serão enviadas de verdade.');
      this.logger.log(`🔗 Preview URL: As URLs aparecerão no console.`);
    }
  }

  async sendForgotPassEmail(to: string, token: string) {
    // Link do Frontend para resetar senha
    // Ajuste a porta se o seu front rodar em outra (ex: 5173)
    const resetLink = `http://localhost:5173/reset-password?token=${token}`;

    const info = await this.transporter.sendMail({
      from: process.env.EMAIL_FROM || '"ZapRoute MVP" <noreply@zaproute.com>',
      to,
      subject: 'Recuperação de Senha - ZapRoute',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
            <h2>Recuperação de Senha</h2>
            <p>Você solicitou a redefinição de sua senha.</p>
            <p>Clique no botão abaixo para criar uma nova senha:</p>
            <a href="${resetLink}" style="background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 10px;">Redefinir Minha Senha</a>
            <p style="margin-top: 20px; font-size: 12px; color: #666;">Se você não solicitou isso, ignore este e-mail.</p>
        </div>
      `,
    });

    this.logger.log(`📧 E-mail enviado para ${to} | ID: ${info.messageId}`);

    // Se for Ethereal, mostra o link para visualizar o email no navegador
    if (nodemailer.getTestMessageUrl(info)) {
      this.logger.log(`📬 [PREVIEW] Veja o e-mail aqui: ${nodemailer.getTestMessageUrl(info)}`);
    }
  }
  async sendWelcomeEmail(to: string, name: string, pass: string) {
    const loginLink = `http://localhost:5173/login`;

    const info = await this.transporter.sendMail({
      from: process.env.EMAIL_FROM || '"ZapRoute Team" <noreply@zaproute.com>',
      to,
      subject: 'Bem-vindo ao ZapRoute! 🚀',
      html: `
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
      `,
    });

    this.logger.log(`📧 Welcome E-mail enviado para ${to} | ID: ${info.messageId}`);

    if (nodemailer.getTestMessageUrl(info)) {
      this.logger.log(`📬 [PREVIEW] Veja o e-mail aqui: ${nodemailer.getTestMessageUrl(info)}`);
    }
  }
}