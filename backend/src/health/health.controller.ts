import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { HealthReport, HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Estado del servicio y de la base de datos' })
  @ApiOkResponse({
    schema: {
      example: {
        status: 'ok',
        timestamp: '2026-10-01T16:00:00.000Z',
        database: 'ok',
        uptime: 3600,
      },
    },
  })
  @ApiServiceUnavailableResponse({
    description: 'La base de datos no responde',
  })
  async check(): Promise<HealthReport> {
    const report = await this.healthService.check();

    if (report.status === 'error') {
      throw new ServiceUnavailableException({
        message: 'La base de datos no responde',
        ...report,
      });
    }

    return report;
  }
}
