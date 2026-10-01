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
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { TeamAction } from '@meetflow/config';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequireTeamAction } from '../../common/decorators/team-action.decorator';
import { MeetingAccessGuard } from '../../common/guards/meeting-access.guard';
import { TeamMembershipContext } from '../../common/guards/team-role.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { UpdateMeetingDto } from './dto/update-meeting.dto';
import { toMeetingPresenter } from './meetings.presenter';
import { MeetingsService } from './meetings.service';

@ApiTags('meetings')
@ApiBearerAuth('access-token')
@UseGuards(MeetingAccessGuard)
@Controller('meetings')
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post()
  @RequireTeamAction(TeamAction.CREATE_MEETING)
  @ApiOperation({ summary: 'Crea una reunion como borrador' })
  @ApiCreatedResponse({ description: 'Reunion creada en estado DRAFT' })
  @ApiBody({ type: CreateMeetingDto })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateMeetingDto,
    @Request() request: { teamMembership: TeamMembershipContext },
  ) {
    const meeting = await this.meetingsService.create(
      user.id,
      user.timezone,
      dto,
    );
    return toMeetingPresenter(meeting, request.teamMembership.role);
  }

  @Get()
  @ApiOperation({ summary: 'Lista las reuniones de tus equipos' })
  @ApiOkResponse({ description: 'Reuniones visibles para el usuario' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('teamId') teamId?: string,
  ) {
    const meetings = await this.meetingsService.listForUser(user.id, teamId);
    return meetings.map((meeting) => toMeetingPresenter(meeting, undefined));
  }

  @Get(':id')
  @RequireTeamAction(TeamAction.VIEW_MEETINGS)
  @ApiOperation({ summary: 'Detalle de una reunion del equipo' })
  @ApiOkResponse({ description: 'Reunion con organizador y equipo' })
  async detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Request()
    request: {
      meeting: { id: string; teamId: string; organizerId: string };
    },
  ) {
    const meeting = await this.meetingsService.getForUser(
      user.id,
      request.meeting,
    );
    return toMeetingPresenter(meeting, undefined);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Edita la reunion (solo organizador o cancelar)' })
  @ApiOkResponse({ description: 'Reunion actualizada' })
  @ApiBody({ type: UpdateMeetingDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateMeetingDto,
    @Request()
    request: {
      meeting: { id: string; teamId: string; organizerId: string };
      teamMembership: TeamMembershipContext;
    },
  ) {
    const meeting = await this.meetingsService.update(
      user.id,
      request.meeting,
      request.teamMembership,
      dto,
    );
    return toMeetingPresenter(meeting, request.teamMembership.role);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina la reunion' })
  @ApiOkResponse({ description: 'Reunion eliminada' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Request()
    request: {
      meeting: { id: string; teamId: string; organizerId: string };
      teamMembership: TeamMembershipContext;
    },
  ): Promise<{ message: string }> {
    await this.meetingsService.delete(
      user.id,
      request.meeting,
      request.teamMembership,
    );
    return { message: 'Reunión eliminada' };
  }
}
