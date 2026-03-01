import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

// Mock do nodemailer
jest.mock('nodemailer');

describe('MailService', () => {
  let service: MailService;
  let mockTransporter: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({
        messageId: 'test-message-id',
      }),
    };

    // Mock createTransport
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Mock createTestAccount for Ethereal
    (nodemailer.createTestAccount as jest.Mock).mockResolvedValue({
      user: 'test@ethereal.email',
      pass: 'test-password',
    });

    // Mock getTestMessageUrl
    (nodemailer.getTestMessageUrl as jest.Mock).mockReturnValue(
      'https://ethereal.email/message/test-id',
    );

    // Clear environment variables
    delete process.env.SENDPULSE_CLIENT_ID;
    delete process.env.SENDPULSE_CLIENT_SECRET;
    delete process.env.EMAIL_HOST;
    delete process.env.EMAIL_PORT;
    delete process.env.EMAIL_USER;
    delete process.env.EMAIL_PASS;
    delete process.env.MAIL_SECURE;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => process.env[key]),
          },
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);

    // Wait for async initialization
    await new Promise((resolve) => setTimeout(resolve, 100));
  });

  describe('Initialization', () => {
    it('deve inicializar com Ethereal em desenvolvimento', async () => {
      expect(nodemailer.createTestAccount).toHaveBeenCalled();
      expect(nodemailer.createTransport).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'smtp.ethereal.email',
          port: 587,
        }),
      );
    });

    it('deve usar SMTP se configurado', async () => {
      process.env.EMAIL_HOST = 'smtp.example.com';
      process.env.EMAIL_USER = 'user@example.com';
      process.env.EMAIL_PASS = 'password';

      (nodemailer.createTransport as jest.Mock).mockClear();

      const module = await Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => process.env[key]),
            },
          },
        ],
      }).compile();

      const smtpService = module.get<MailService>(MailService);

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(nodemailer.createTransport).toHaveBeenLastCalledWith(
        expect.objectContaining({
          host: 'smtp.example.com',
          port: 587,
        }),
      );
    });
  });

  describe('sendForgotPassEmail', () => {
    it('deve enviar email de recuperação de senha', async () => {
      const email = 'user@example.com';
      const token = 'reset-token-123';

      await service.sendForgotPassEmail(email, token);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Recuperação de Senha - ZapRoute',
          html: expect.stringContaining(token),
        }),
      );
    });

    it('deve incluir link de reset no email', async () => {
      const email = 'user@example.com';
      const token = 'test-token';

      await service.sendForgotPassEmail(email, token);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('reset-password?token=');
      expect(callArgs.html).toContain(token);
    });

    it('deve incluir instruções no email', async () => {
      await service.sendForgotPassEmail('test@example.com', 'token');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('Recuperação de Senha');
      expect(callArgs.html).toContain('Redefinir Minha Senha');
    });
  });

  describe('sendWelcomeEmail', () => {
    it('deve enviar email de boas-vindas', async () => {
      const email = 'newuser@example.com';
      const name = 'João Silva';
      const password = 'temp-pass-123';

      await service.sendWelcomeEmail(email, name, password);

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: email,
          subject: 'Bem-vindo ao ZapRoute! 🚀',
          html: expect.stringContaining(name),
        }),
      );
    });

    it('deve incluir credenciais no email', async () => {
      const email = 'user@example.com';
      const name = 'Maria Santos';
      const password = 'senha123';

      await service.sendWelcomeEmail(email, name, password);

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(email);
      expect(callArgs.html).toContain(password);
      expect(callArgs.html).toContain('Senha Temporária');
    });

    it('deve incluir nome do usuário na saudação', async () => {
      const name = 'Pedro Costa';

      await service.sendWelcomeEmail('test@example.com', name, 'pass');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain(`Bem-vindo ao ZapRoute, ${name}!`);
    });

    it('deve incluir link de login', async () => {
      await service.sendWelcomeEmail('test@example.com', 'User', 'pass');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('login');
      expect(callArgs.html).toContain('Acessar Plataforma');
    });
  });

  describe('Email Formatting', () => {
    it('deve usar HTML formatado', async () => {
      await service.sendForgotPassEmail('test@example.com', 'token');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toContain('<div');
      expect(callArgs.html).toContain('style=');
    });

    it('deve incluir remetente padrão', async () => {
      await service.sendForgotPassEmail('test@example.com', 'token');

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.from).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('deve propagar erro se envio falhar', async () => {
      mockTransporter.sendMail.mockRejectedValue(
        new Error('SMTP connection failed'),
      );

      await expect(
        service.sendForgotPassEmail('test@example.com', 'token'),
      ).rejects.toThrow('SMTP connection failed');
    });
  });

  describe('Preview URLs', () => {
    it('deve logar preview URL em modo de teste', async () => {
      await service.sendWelcomeEmail('test@example.com', 'User', 'pass');

      expect(nodemailer.getTestMessageUrl).toHaveBeenCalled();
    });
  });
});
