import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma.service';
import { MailService } from '../mail/mail.service';
import * as bcrypt from 'bcryptjs';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let jwtService: JwtService;
  let mailService: MailService;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockMailService = {
    sendForgotPassEmail: jest.fn().mockResolvedValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    jwtService = module.get<JwtService>(JwtService);
    mailService = module.get<MailService>(MailService);

    // Reset mocks between tests
    jest.clearAllMocks();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const hashedPassword = await bcrypt.hash('password123', 10);
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'ADMIN',
        phone: null,
        avatarUrl: null,
        status: 'ACTIVE',
        resetToken: null,
        resetTokenExpires: null,
        tenantId: 'tenant-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser('test@test.com', 'password123');

      expect(result).toBeDefined();
      expect(result?.email).toBe('test@test.com');
      expect(result?.name).toBe('Test User');
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@test.com' },
        include: { tenant: true },
      });
    });

    it('should return null when user is not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.validateUser('wrong@test.com', 'password');

      expect(result).toBeNull();
    });

    it('should return null when password is incorrect', async () => {
      const hashedPassword = await bcrypt.hash('correctpassword', 10);
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        password: hashedPassword,
        name: 'Test User',
        role: 'ADMIN',
        phone: null,
        avatarUrl: null,
        status: 'ACTIVE',
        resetToken: null,
        resetTokenExpires: null,
        tenantId: 'tenant-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.validateUser(
        'test@test.com',
        'wrongpassword',
      );

      expect(result).toBeNull();
    });
  });

  describe('login', () => {
    it('should return access token and user data', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'ADMIN',
        tenantId: 'tenant-1',
      };

      mockJwtService.sign.mockReturnValue('mock-jwt-token-12345');

      const result = await service.login(mockUser as any);

      expect(result).toHaveProperty('access_token');
      expect(result.access_token).toBe('mock-jwt-token-12345');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe('test@test.com');
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        email: mockUser.email,
        sub: mockUser.id,
        role: mockUser.role,
        tenantId: mockUser.tenantId,
      });
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset token and send email', async () => {
      const mockUser = {
        id: '1',
        email: 'test@test.com',
        name: 'Test User',
        role: 'ADMIN',
        phone: null,
        avatarUrl: null,
        status: 'ACTIVE',
        password: 'hashed',
        resetToken: null,
        resetTokenExpires: null,
        tenantId: 'tenant-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        resetToken: 'reset-token-123',
        resetTokenExpires: new Date(Date.now() + 3600000),
      });

      const result = await service.forgotPassword('test@test.com');

      expect(result).toHaveProperty('message');
      expect(mockPrismaService.user.update).toHaveBeenCalled();
    });

    it('should return success message even when user is not found (security)', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      const result = await service.forgotPassword('notfound@test.com');
      expect(result).toHaveProperty('message');
      expect(result.message).toContain('instruções foram enviadas');
    });
  });
});
