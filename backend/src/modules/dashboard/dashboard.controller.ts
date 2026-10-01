import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { DashboardService } from './dashboard.service';
import { DashboardPresented } from './dashboard.presenter';

@ApiTags('dashboard')
@ApiBearerAuth('access-token')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resumen del dashboard del usuario' })
  @ApiOkResponse({
    description: 'Métricas, reuniones, tareas, decisiones y actividad',
  })
  async summary(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<DashboardPresented> {
    return this.dashboardService.summary(user.id);
  }
}
