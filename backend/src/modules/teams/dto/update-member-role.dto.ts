import { ApiProperty } from '@nestjs/swagger';
import { TeamRole } from '@meetflow/types';
import { IsEnum } from 'class-validator';

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: TeamRole })
  @IsEnum(TeamRole)
  role: TeamRole;
}
