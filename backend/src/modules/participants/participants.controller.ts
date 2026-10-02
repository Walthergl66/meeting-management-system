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
import { AttendanceStatus, ParticipantStatus } from '../../shared';
import { InviteParticipantsDto } from './dto/invite-participants.dto';
import {
  RecordAttendanceDto,
  RespondParticipationDto,
} from './dto/participation-status.dto';
import { toParticipantPresenter } from './participants.presenter';
import { ParticipantsService } from './participants.service';

@ApiTags('participants')
@ApiBearerAuth('access-token')
@UseGuards(MeetingAccessGuard)
@Controller('meetings/:id/participants')
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista los participantes de la reunión' })
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
    const participants = await this.participantsService.list(request.meeting);
    return participants.map(toParticipantPresenter);
  }

  @Post()
  @ApiOperation({ summary: 'Invita uno o varios participantes del equipo' })
  async invite(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteParticipantsDto,
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
    const created = await this.participantsService.invite(
      user.id,
      request.meeting,
      request.teamMembership,
      dto.userIds,
    );
    return created.map(toParticipantPresenter);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Actualiza el estado de participación propio' })
  async respond(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: RespondParticipationDto,
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
    const participant = await this.participantsService.respond(
      user.id,
      request.meeting,
      dto.status as ParticipantStatus,
    );
    return toParticipantPresenter(participant);
  }

  @Patch(':userId/attendance')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registra la asistencia real de un participante' })
  async recordAttendance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
    @Body() dto: RecordAttendanceDto,
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
    const participant = await this.participantsService.recordAttendance(
      user.id,
      request.meeting,
      request.teamMembership,
      userId,
      dto.attendance as AttendanceStatus,
    );
    return toParticipantPresenter(participant);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina un participante de la reunión' })
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('userId') userId: string,
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
    await this.participantsService.remove(
      user.id,
      request.meeting,
      request.teamMembership,
      userId,
    );
    return { message: 'Participante eliminado' };
  }
}
