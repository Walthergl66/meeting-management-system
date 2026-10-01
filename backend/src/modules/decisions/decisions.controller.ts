import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { MeetingAccessGuard } from '../../common/guards/meeting-access.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateDecisionDto, UpdateDecisionDto } from './dto/decision.dto';
import { DecisionsService } from './decisions.service';
import { toDecisionPresenter } from './decisions.presenter';

@ApiTags('decisions')
@ApiBearerAuth('access-token')
@UseGuards(MeetingAccessGuard)
@Controller()
export class DecisionsController {
  constructor(private readonly decisionsService: DecisionsService) {}

  @Get('meetings/:id/decisions')
  @ApiOperation({ summary: 'Lista las decisiones de la reunión' })
  async list(
    @Request()
    request: {
      meeting: { id: string; teamId: string; organizerId: string };
    },
  ) {
    const decisions = await this.decisionsService.list(request.meeting);
    return decisions.map(toDecisionPresenter);
  }

  @Post('meetings/:id/decisions')
  @ApiOperation({ summary: 'Registra una decisión en la reunión' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateDecisionDto,
    @Request()
    request: { meeting: { id: string; teamId: string; organizerId: string } },
  ) {
    const decision = await this.decisionsService.create(
      user.id,
      request.meeting,
      dto,
    );
    return toDecisionPresenter(decision);
  }

  @Patch('decisions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualiza una decisión' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') decisionId: string,
    @Body() dto: UpdateDecisionDto,
    @Request()
    request: { meeting: { id: string; teamId: string; organizerId: string } },
  ) {
    const decision = await this.decisionsService.update(
      user.id,
      request.meeting,
      decisionId,
      dto,
    );
    return toDecisionPresenter(decision);
  }

  @Delete('decisions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina una decisión' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') decisionId: string,
    @Request()
    request: { meeting: { id: string; teamId: string; organizerId: string } },
  ): Promise<{ message: string }> {
    await this.decisionsService.remove(user.id, request.meeting, decisionId);
    return { message: 'Decisión eliminada' };
  }
}
