import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ana García López' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'America/Bogota' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @ApiPropertyOptional({ example: 'es', enum: ['es', 'en'] })
  @IsOptional()
  @IsIn(['es', 'en'])
  locale?: string;

  @ApiPropertyOptional({ example: 'https://cdn.meetflow.app/avatars/ana.png' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  avatarUrl?: string;
}
