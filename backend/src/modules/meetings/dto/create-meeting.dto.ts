import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateMeetingDto {
  @ApiProperty({ example: 'Sincronizacion semanal' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    example: 'Revision de avances del sprint.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: 'cm...' })
  @IsString()
  teamId: string;

  @ApiProperty({
    example: '2026-10-01T10:00:00',
    description:
      'Inicio en hora local; el backend lo normaliza a UTC con el timezone indicado.',
  })
  @IsISO8601()
  startTime: string;

  @ApiProperty({ example: '2026-10-01T10:30:00' })
  @IsISO8601()
  endTime: string;

  @ApiPropertyOptional({
    example: 'America/Mexico_City',
    description: 'IANA. Default: la zona horaria del usuario.',
  })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ example: 'Sala A - piso 3' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @ApiPropertyOptional({ example: 'https://meet.gg/abc' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  meetingUrl?: string;
}
