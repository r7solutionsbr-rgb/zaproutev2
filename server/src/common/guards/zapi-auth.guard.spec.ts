import { Test, TestingModule } from '@nestjs/testing';
import { ZApiAuthGuard } from './zapi-auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

describe('ZApiAuthGuard', () => {
  let guard: ZApiAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ZApiAuthGuard],
    }).compile();

    guard = module.get<ZApiAuthGuard>(ZApiAuthGuard);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access if token matches ZAPI_CLIENT_TOKEN', () => {
    process.env.ZAPI_CLIENT_TOKEN = 'secret-token';
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'client-token': 'secret-token' },
          query: {},
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow access if token matches via query param', () => {
    process.env.ZAPI_CLIENT_TOKEN = 'secret-token';
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          query: { token: 'secret-token' },
        }),
      }),
    } as unknown as ExecutionContext;

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should throw UnauthorizedException if token is missing', () => {
    process.env.ZAPI_CLIENT_TOKEN = 'secret-token';
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: {},
          query: {},
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if token is invalid', () => {
    process.env.ZAPI_CLIENT_TOKEN = 'secret-token';
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'client-token': 'wrong-token' },
          query: {},
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should throw UnauthorizedException if ZAPI_CLIENT_TOKEN is not configured', () => {
    delete process.env.ZAPI_CLIENT_TOKEN;
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { 'client-token': 'any-token' },
          query: {},
        }),
      }),
    } as unknown as ExecutionContext;

    expect(() => guard.canActivate(context)).toThrow(
      'Configuração de segurança incompleta no servidor.',
    );
  });
});
