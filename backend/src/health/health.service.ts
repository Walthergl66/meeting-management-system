import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface HealthReport {
  status: 'ok' | 'error';
  timestamp: string;
  database: 'ok' | 'error';
  uptime: number;
}

@Injectable()
export class HealthService {
  private readonly startedAt = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  getUptimeSeconds(): number {
    return Math.floor((Date.now() - this.startedAt) / 1000);
  }

  async check(): Promise<HealthReport> {
    const database = (await this.prisma.isHealthy()) ? 'ok' : 'error';

    return {
      status: database === 'ok' ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      database,
      uptime: this.getUptimeSeconds(),
    };
  }
}
