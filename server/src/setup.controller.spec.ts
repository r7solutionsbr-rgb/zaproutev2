import { Test, TestingModule } from '@nestjs/testing';
import { SetupController } from './setup.controller';
import { PrismaService } from './prisma.service';
import { HttpStatus } from '@nestjs/common';
import { exec } from 'child_process';
import * as bcrypt from 'bcryptjs';

jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  genSalt: jest.fn(),
  hash: jest.fn(),
}));

describe('SetupController', () => {
  let controller: SetupController;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      tenant: { upsert: jest.fn() },
      user: { upsert: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetupController],
      providers: [
        {
          provide: PrismaService,
          useValue: prisma,
        },
      ],
    }).compile();

    controller = module.get<SetupController>(SetupController);
    jest.clearAllMocks();
    delete process.env.ADMIN_KEY;
  });

  it('deve negar acesso sem admin key', async () => {
    await expect(controller.dbPush({})).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
    });
  });

  it('deve executar db push com sucesso', async () => {
    process.env.ADMIN_KEY = 'secret';

    const execMock = exec as unknown as jest.MockedFunction<typeof exec>;
    execMock.mockImplementation(
      (_cmd: string, optionsOrCallback: any, callback?: any) => {
        const cb =
          typeof optionsOrCallback === 'function'
            ? optionsOrCallback
            : callback;
        cb?.(null, 'ok', '');
        return {} as any;
      },
    );

    await expect(
      controller.dbPush({ 'x-admin-key': 'secret' }),
    ).resolves.toMatchObject({
      success: true,
      stdout: 'ok',
    });
  });

  it('deve retornar erro no db push quando falhar', async () => {
    process.env.ADMIN_KEY = 'secret';

    const execMock = exec as unknown as jest.MockedFunction<typeof exec>;
    execMock.mockImplementation(
      (_cmd: string, optionsOrCallback: any, callback?: any) => {
        const cb =
          typeof optionsOrCallback === 'function'
            ? optionsOrCallback
            : callback;
        cb?.(new Error('failed'), '', 'stderr');
        return {} as any;
      },
    );

    await expect(
      controller.dbPush({ 'x-admin-key': 'secret' }),
    ).resolves.toMatchObject({
      success: false,
      error: 'failed',
      stderr: 'stderr',
    });
  });

  it('deve executar seed com sucesso', async () => {
    process.env.ADMIN_KEY = 'secret';

    (bcrypt.genSalt as jest.Mock).mockResolvedValue('salt');
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed');

    prisma.tenant.upsert.mockResolvedValue({ id: 'tenant-1' });
    prisma.user.upsert.mockResolvedValue({ email: 'admin@zaproute.com' });

    await expect(controller.seed({ 'x-admin-key': 'secret' })).resolves.toEqual({
      success: true,
      message: 'Banco resetado e Admin recriado com senha "123456"',
      user: { email: 'admin@zaproute.com' },
    });
  });

  it('deve lançar erro se seed falhar', async () => {
    process.env.ADMIN_KEY = 'secret';

    prisma.tenant.upsert.mockRejectedValue(new Error('db error'));

    await expect(controller.seed({ 'x-admin-key': 'secret' })).rejects.toMatchObject({
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      message: 'Erro ao inicializar sistema: db error',
    });
  });
});
