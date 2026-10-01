import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsISO8601,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ example: 'Implementar endpoint de búsqueda' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'HIGH' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: '2026-10-20T23:59:00Z' })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'clxxxxxxxx' })
  @IsOptional()
  @IsString()
  assigneeId?: string;

  @ApiProperty({ example: 'clxxxxxxxx' })
  @IsString()
  teamId: string;

  @ApiPropertyOptional({ example: 'clxxxxxxxx' })
  @IsOptional()
  @IsString()
  meetingId?: string;

  @ApiPropertyOptional({ example: 'clxxxxxxxx' })
  @IsOptional()
  @IsString()
  decisionId?: string;
}

export class UpdateTaskDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({ example: 'IN_PROGRESS' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'HIGH' })
  @IsOptional()
  @IsString()
  priority?: string;

  @ApiPropertyOptional({ example: '2026-10-20T23:59:00Z' })
  @IsOptional()
  @IsISO8601()
  dueDate?: string;

  @ApiPropertyOptional({ example: 'clxxxxxxxx' })
  @IsOptional()
  @IsString()
  assigneeId?: string;
}
