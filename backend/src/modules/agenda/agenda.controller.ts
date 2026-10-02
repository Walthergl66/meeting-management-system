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
import { TeamMembershipContext } from '../../common/guards/team-role.guard';
import { AgendaService } from './agenda.service';
import { toAgendaItemPresenter } from './agenda.presenter';
import { CreateAgendaItemDto } from './dto/create-agenda-item.dto';
import { ReorderAgendaDto } from './dto/reorder-agenda.dto';
import { UpdateAgendaItemDto } from './dto/update-agenda-item.dto';

@ApiTags('agenda')
@ApiBearerAuth('access-token')
@UseGuards(MeetingAccessGuard)
@Controller()
export class AgendaController {
  constructor(private readonly agendaService: AgendaService) {}

  @Get('meetings/:id/agenda')
  @ApiOperation({ summary: 'Lista los puntos de agenda ordenados' })
  async list(
    @Request()
    request: {
      meeting: {
        id: string;
        teamId: string;
        organizerId: string;
        status: string;
      };
    },
  ) {
    const items = await this.agendaService.list(request.meeting);
    return items.map(toAgendaItemPresenter);
  }

  @Post('meetings/:id/agenda')
  @ApiOperation({ summary: 'Crea un punto de agenda' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAgendaItemDto,
    @Request()
    request: {
      meeting: {
        id: string;
        teamId: string;
        organizerId: string;
        status: string;
      };
      teamMembership: TeamMembershipContext;
    },
  ) {
    const item = await this.agendaService.create(
      user.id,
      request.meeting,
      request.teamMembership,
      dto,
    );
    return toAgendaItemPresenter(item);
  }

  @Patch('meetings/:id/agenda/reorder')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reordena los puntos de agenda' })
  async reorder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ReorderAgendaDto,
    @Request()
    request: {
      meeting: {
        id: string;
        teamId: string;
        organizerId: string;
        status: string;
      };
      teamMembership: TeamMembershipContext;
    },
  ) {
    const items = await this.agendaService.reorder(
      user.id,
      request.meeting,
      request.teamMembership,
      dto.order,
    );
    return items.map(toAgendaItemPresenter);
  }

  @Patch('agenda/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualiza un punto de agenda' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateAgendaItemDto,
    @Request()
    request: {
      meeting: {
        id: string;
        teamId: string;
        organizerId: string;
        status: string;
      };
      teamMembership: TeamMembershipContext;
    },
  ) {
    const item = await this.agendaService.update(
      user.id,
      request.meeting,
      request.teamMembership,
      itemId,
      dto,
    );
    return toAgendaItemPresenter(item);
  }

  @Delete('agenda/:itemId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina un punto de agenda' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('itemId') itemId: string,
    @Request()
    request: {
      meeting: {
        id: string;
        teamId: string;
        organizerId: string;
        status: string;
      };
      teamMembership: TeamMembershipContext;
    },
  ): Promise<{ message: string }> {
    await this.agendaService.remove(
      user.id,
      request.meeting,
      request.teamMembership,
      itemId,
    );
    return { message: 'Punto de agenda eliminado' };
  }
}
