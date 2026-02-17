import { envValidationSchema } from './env.validation';

describe('envValidationSchema', () => {
  it('should validate a correct configuration', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      JWT_SECRET: 'a'.repeat(32),
      NODE_ENV: 'development',
    };

    const { error, value } = envValidationSchema.validate(config);

    expect(error).toBeUndefined();
    expect(value.DATABASE_URL).toBe(config.DATABASE_URL);
    expect(value.JWT_SECRET).toBe(config.JWT_SECRET);
  });

  it('should throw error if DATABASE_URL is missing', () => {
    const config = {
      JWT_SECRET: 'a'.repeat(32),
    };

    const { error } = envValidationSchema.validate(config);

    expect(error).toBeDefined();
    expect(error.message).toContain('DATABASE_URL é obrigatória');
  });

  it('should throw error if JWT_SECRET is too short', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      JWT_SECRET: 'short',
    };

    const { error } = envValidationSchema.validate(config);

    expect(error).toBeDefined();
    expect(error.message).toContain(
      'JWT_SECRET deve ter no mínimo 32 caracteres',
    );
  });

  it('should set default values', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      JWT_SECRET: 'a'.repeat(32),
    };

    const { value } = envValidationSchema.validate(config);

    expect(value.NODE_ENV).toBe('development');
    expect(value.PORT).toBe(3000);
    expect(value.ZAPI_BASE_URL).toBe('https://api.z-api.io');
  });

  it('should validate optional fields with specific formats', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      JWT_SECRET: 'a'.repeat(32),
      EMAIL_USER: 'invalid-email',
    };

    const { error } = envValidationSchema.validate(config);

    expect(error).toBeDefined();
    expect(error.message).toContain('EMAIL_USER deve ser um email válido');
  });

  it('should allow valid log levels', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      JWT_SECRET: 'a'.repeat(32),
      LOG_LEVEL: 'debug',
    };

    const { error, value } = envValidationSchema.validate(config);

    expect(error).toBeUndefined();
    expect(value.LOG_LEVEL).toBe('debug');
  });

  it('should fail on invalid log level', () => {
    const config = {
      DATABASE_URL: 'postgresql://user:pass@host:5432/db',
      JWT_SECRET: 'a'.repeat(32),
      LOG_LEVEL: 'invalid',
    };

    const { error } = envValidationSchema.validate(config);

    expect(error).toBeDefined();
  });
});
