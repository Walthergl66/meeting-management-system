import { ApiPropertyOptional } from '@nestjs/swagger';
import { MeetingStatus } from '@meetflow/types';
import {
  IsEnum,
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

export class UpdateMeetingDto {
  @ApiPropertyOptional({ example: 'Sincronizacion semanal - actualizada' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '2026-10-01T10:00:00' })
  @IsOptional()
  @IsISO8601()
  startTime?: string;

  @ApiPropertyOptional({ example: '2026-10-01T10:30:00' })
  @IsOptional()
  @IsISO8601()
  endTime?: string;

  @ApiPropertyOptional({ example: 'America/Mexico_City' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'Sala B - piso 1' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'https://meet.gg/xyz' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  meetingUrl?: string;

  @ApiPropertyOptional({ enum: MeetingStatus })
  @IsOptional()
  @IsEnum(MeetingStatus)
  status?: MeetingStatus;
}
