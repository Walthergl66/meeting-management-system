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
import {
  TeamMembershipContext,
  TeamRoleGuard,
} from '../../common/guards/team-role.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateTeamDto } from './dto/create-team.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { TransferOwnershipDto } from './dto/transfer-ownership.dto';
import { UpdateMemberRoleDto } from './dto/update-member-role.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import {
  toCreatedMemberPresenter,
  toDetailedTeamPresenter,
  toTeamPresenter,
} from './teams.presenter';
import { TeamsService } from './teams.service';

@ApiTags('teams')
@ApiBearerAuth('access-token')
@UseGuards(TeamRoleGuard)
@Controller('teams')
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Post()
  @ApiOperation({ summary: 'Crea un equipo y su dueño como miembro' })
  @ApiCreatedResponse({ description: 'Equipo creado con el OWNER de miembro' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateTeamDto,
  ) {
    return toTeamPresenter(await this.teamsService.create(user.id, dto));
  }

  @Get()
  @ApiOperation({ summary: 'Lista los equipos del usuario autenticado' })
  @ApiOkResponse({ description: 'Equipos donde el usuario es miembro' })
  async list(@CurrentUser() user: AuthenticatedUser) {
    const teams = await this.teamsService.listForUser(user.id);
    return teams.map(toTeamPresenter);
  }

  @Get(':teamId')
  @ApiOperation({ summary: 'Detalle de un equipo del que eres miembro' })
  @ApiOkResponse({ description: 'Equipo con sus miembros' })
  async detail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
  ) {
    return toDetailedTeamPresenter(
      await this.teamsService.getForUser(user.id, teamId),
    );
  }

  @Patch(':teamId')
  @RequireTeamAction(TeamAction.EDIT_TEAM)
  @ApiOperation({ summary: 'Edita nombre o descripción del equipo' })
  @ApiOkResponse({ description: 'Equipo actualizado' })
  @ApiBody({ type: UpdateTeamDto })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Body() dto: UpdateTeamDto,
    @Request() request: { teamMembership: TeamMembershipContext },
  ) {
    const team = await this.teamsService.update(
      user.id,
      teamId,
      dto,
      request.teamMembership,
    );
    return toTeamPresenter(team);
  }

  @Delete(':teamId')
  @RequireTeamAction(TeamAction.DELETE_TEAM)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Elimina el equipo y sus miembros en cascada' })
  @ApiOkResponse({ description: 'Equipo eliminado' })
  async delete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
  ): Promise<{ message: string }> {
    await this.teamsService.delete(user.id, teamId);
    return { message: 'Equipo eliminado' };
  }

  @Post(':teamId/members')
  @RequireTeamAction(TeamAction.INVITE_MEMBERS)
  @ApiOperation({ summary: 'Invita por correo a un usuario registrado' })
  @ApiCreatedResponse({ description: 'Miembro agregado' })
  async invite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Body() dto: InviteMemberDto,
    @Request() request: { teamMembership: TeamMembershipContext },
  ) {
    const member = await this.teamsService.invite(
      user.id,
      teamId,
      dto.email,
      request.teamMembership,
    );
    return toCreatedMemberPresenter(member);
  }

  @Patch(':teamId/members/:memberId')
  @RequireTeamAction(TeamAction.CHANGE_MEMBER_ROLE)
  @ApiOperation({ summary: 'Cambia el rol de un miembro' })
  @ApiOkResponse({ description: 'Rol actualizado' })
  async changeRole(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberRoleDto,
    @Request() request: { teamMembership: TeamMembershipContext },
  ) {
    const member = await this.teamsService.changeRole(
      user.id,
      teamId,
      memberId,
      dto.role,
      request.teamMembership,
    );

    return {
      id: member.id,
      userId: member.userId,
      role: member.role,
      joinedAt: member.joinedAt,
    };
  }

  @Delete(':teamId/members/:memberId')
  @RequireTeamAction(TeamAction.REMOVE_MEMBER)
  @ApiOperation({ summary: 'Elimina a un miembro del equipo' })
  @ApiOkResponse({ description: 'Miembro eliminado' })
  async removeMember(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Param('memberId') memberId: string,
    @Request() request: { teamMembership: TeamMembershipContext },
  ): Promise<{ message: string }> {
    await this.teamsService.removeMember(
      user.id,
      teamId,
      memberId,
      request.teamMembership,
    );
    return { message: 'Miembro eliminado' };
  }

  @Post(':teamId/leave')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'El usuario abandona el equipo' })
  @ApiOkResponse({ description: 'El usuario dejó de ser miembro' })
  async leave(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
  ): Promise<{ message: string }> {
    await this.teamsService.leave(user.id, teamId);
    return { message: 'Abandonaste el equipo' };
  }

  @Post(':teamId/transfer-ownership')
  @RequireTeamAction(TeamAction.TRANSFER_OWNERSHIP)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Transfiere la propiedad del equipo' })
  @ApiOkResponse({
    description: 'Ownership transferido, el antiguo OWNER pasa a ADMIN',
  })
  async transferOwnership(
    @CurrentUser() user: AuthenticatedUser,
    @Param('teamId') teamId: string,
    @Body() dto: TransferOwnershipDto,
  ): Promise<{ message: string }> {
    await this.teamsService.transferOwnership(user.id, teamId, dto.newOwnerId);
    return { message: 'Ownership transferido' };
  }
}
