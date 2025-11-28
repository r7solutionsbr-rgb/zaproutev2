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
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });
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
}