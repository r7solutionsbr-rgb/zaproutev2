import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { HttpException, HttpStatus } from '@nestjs/common';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            validateUser: jest.fn(),
            login: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  it('deve lançar Unauthorized quando credenciais inválidas', async () => {
    authService.validateUser.mockResolvedValue(null as any);

    await expect(
      controller.login({ email: 'x@y.com', password: '123456' }),
    ).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      message: 'E-mail ou senha incorretos',
    });
  });

  it('deve realizar login quando credenciais válidas', async () => {
    const user = { id: 'user-1' } as any;
    authService.validateUser.mockResolvedValue(user);
    authService.login.mockResolvedValue({ access_token: 'token' } as any);

    await expect(
      controller.login({ email: 'x@y.com', password: '123456' }),
    ).resolves.toEqual({ access_token: 'token' });
  });

  it('deve solicitar recuperação de senha', async () => {
    authService.forgotPassword.mockResolvedValue({ success: true } as any);

    await expect(
      controller.forgotPassword({ email: 'user@example.com' }),
    ).resolves.toEqual({ success: true });
  });

  it('deve redefinir senha com token', async () => {
    authService.resetPassword.mockResolvedValue({ success: true } as any);

    await expect(
      controller.resetPassword({ token: 'TOKEN', password: 'newpass' }),
    ).resolves.toEqual({ success: true });
  });

  it('deve retornar erro ao redefinir senha com token inválido', async () => {
    authService.resetPassword.mockRejectedValue(new Error('Token inválido'));

    await expect(
      controller.resetPassword({ token: 'BAD', password: 'newpass' }),
    ).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      message: 'Token inválido',
    });
  });
});
