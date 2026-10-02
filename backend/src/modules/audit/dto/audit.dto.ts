import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { AUDIT_ACTIONS, AUDIT_ENTITY_TYPES } from '../../../shared';

export class AuditQueryDto {
  @ApiPropertyOptional({ enum: AUDIT_ACTIONS })
  @IsOptional()
  @IsEnum(AUDIT_ACTIONS)
  action?: (typeof AUDIT_ACTIONS)[number];

  @ApiPropertyOptional({ enum: AUDIT_ENTITY_TYPES })
  @IsOptional()
  @IsEnum(AUDIT_ENTITY_TYPES)
  entity?: (typeof AUDIT_ENTITY_TYPES)[number];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  entityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number;

  @ApiPropertyOptional({ default: 0, minimum: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class AuditLogDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  user!: { id: string; name: string; email: string };

  @ApiProperty({ enum: AUDIT_ACTIONS })
  action!: string;

  @ApiProperty({ enum: AUDIT_ENTITY_TYPES })
  entity!: string;

  @ApiProperty()
  entityId!: string;

  @ApiProperty({ nullable: true })
  ipAddress!: string | null;

  @ApiProperty({ nullable: true })
  userAgent!: string | null;

  @ApiProperty({ nullable: true })
  metadata!: unknown;

  @ApiProperty()
  timestamp!: Date;
}

export class AuditLogPageDto {
  @ApiProperty({ type: [AuditLogDto] })
  items!: AuditLogDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty()
  offset!: number;
}
