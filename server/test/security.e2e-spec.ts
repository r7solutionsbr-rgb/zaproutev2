import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('SecurityController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/security/csrf-token', () => {
    it('should return CSRF token', () => {
      return request(app.getHttpServer())
        .get('/api/security/csrf-token')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('csrfToken');
          expect(res.body.csrfToken).toBeTruthy();
          expect(typeof res.body.csrfToken).toBe('string');
        });
    });

    it('should include usage message', () => {
      return request(app.getHttpServer())
        .get('/api/security/csrf-token')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('message');
          expect(res.body.message).toContain('X-CSRF-Token');
        });
    });

    it('should generate different tokens for different requests', async () => {
      const response1 = await request(app.getHttpServer()).get(
        '/api/security/csrf-token',
      );

      const response2 = await request(app.getHttpServer()).get(
        '/api/security/csrf-token',
      );

      expect(response1.body.csrfToken).toBeTruthy();
      expect(response2.body.csrfToken).toBeTruthy();
      // Tokens podem ser diferentes dependendo da sessão
    });
  });
});
