import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/auth/login', () => {
    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'wrong@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should return 400 for missing email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ password: 'password123' })
        .expect(400);
    });

    it('should return 400 for missing password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test@test.com' })
        .expect(400);
    });
  });

  describe('POST /api/auth/forgot-password', () => {
    it('should return 400 for missing email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({})
        .expect(400);
    });

    it('should return 400 for invalid email format', () => {
      return request(app.getHttpServer())
        .post('/api/auth/forgot-password')
        .send({ email: 'not-an-email' })
        .expect(400);
    });
  });

  describe('Rate Limiting', () => {
    it('should enforce rate limiting on login endpoint', async () => {
      // Fazer 5 tentativas (limite configurado)
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/auth/login')
          .send({ email: `test${i}@test.com`, password: 'wrong' });
      }

      // 6ª tentativa deve retornar 429 (Too Many Requests)
      const response = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'test6@test.com', password: 'wrong' });

      expect(response.status).toBe(429);
    }, 10000); // Timeout maior para este teste
  });
});
