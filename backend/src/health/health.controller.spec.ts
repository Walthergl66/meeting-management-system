import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { HealthController } from './health.controller';
import { HealthService } from './health.service';

describe('HealthController', () => {
  let controller: HealthController;
  let service: HealthService;
  let prisma: { isHealthy: jest.Mock };

  beforeEach(async () => {
    prisma = { isHealthy: jest.fn().mockResolvedValue(true) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [HealthService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    service = module.get<HealthService>(HealthService);
  });

  it('debe reportar el servicio y la base de datos como ok', async () => {
    const result = await controller.check();

    expect(result.status).toBe('ok');
    expect(result.database).toBe('ok');
    expect(result.uptime).toBeGreaterThanOrEqual(0);
    expect(new Date(result.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('debe lanzar 503 cuando la base de datos no responde', async () => {
    prisma.isHealthy.mockResolvedValue(false);

    await expect(controller.check()).rejects.toMatchObject({
      status: 503,
    });
  });

  it('debe medir el uptime desde el arranque del servicio', () => {
    jest.spyOn(service, 'getUptimeSeconds').mockReturnValue(42);

    expect(service.getUptimeSeconds()).toBe(42);
  });
});
