import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { configureApp } from './../src/common/configure-app';
import { setupSwagger } from './../src/swagger';

describe('MeetFlow API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(moduleFixture.createNestApplication());
    setupSwagger(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  describe('GET /', () => {
    it('responde con la información de la API en un envelope data', async () => {
      const response = await request(app.getHttpServer()).get('/').expect(200);

      expect(response.body).toEqual({
        data: {
          name: 'MeetFlow API',
          version: '0.1.0',
          documentation: '/api/docs',
          health: '/health',
        },
      });
    });
  });

  describe('GET /health', () => {
    it('responde con el estado del servicio', async () => {
      const response = await request(app.getHttpServer())
        .get('/health')
        .expect(200);

      expect(response.body.data.status).toBe('ok');
      expect(response.body.data.uptime).toBeGreaterThanOrEqual(0);
      expect(response.body.data.timestamp).toBeDefined();
    });
  });

  describe('Swagger', () => {
    it('expone el documento OpenAPI en /api/docs-json', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);

      expect(response.body.info.title).toBe('MeetFlow API');
      expect(response.body.paths['/health']).toBeDefined();
    });
  });
});
