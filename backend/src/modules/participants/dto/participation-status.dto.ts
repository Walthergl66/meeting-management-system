import { ApiProperty } from '@nestjs/swagger';
import { AttendanceStatus, ParticipantStatus } from '@meetflow/types';
import { IsEnum } from 'class-validator';

export class RespondParticipationDto {
  @ApiProperty({ enum: ['ACCEPTED', 'DECLINED', 'TENTATIVE'] })
  @IsEnum({
    ACCEPTED: ParticipantStatus.ACCEPTED,
    DECLINED: ParticipantStatus.DECLINED,
    TENTATIVE: ParticipantStatus.TENTATIVE,
  } as Record<string, ParticipantStatus>)
  status: ParticipantStatus;
}

export class RecordAttendanceDto {
  @ApiProperty({ enum: ['ATTENDED', 'ABSENT'] })
  @IsEnum(AttendanceStatus)
  attendance: AttendanceStatus;
}
