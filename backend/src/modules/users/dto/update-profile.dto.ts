import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ana' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  @MaxLength(60, { message: 'El nombre no puede superar los 60 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  firstName?: string;

  @ApiPropertyOptional({ example: 'García López' })
  @IsOptional()
  @IsString()
  @MinLength(1, { message: 'El apellido es obligatorio' })
  @MaxLength(60, { message: 'El apellido no puede superar los 60 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  lastName?: string;

  @ApiPropertyOptional({ example: 'ana_garcia', minLength: 2, maxLength: 30 })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'El alias debe tener al menos 2 caracteres' })
  @MaxLength(30, { message: 'El alias no puede superar los 30 caracteres' })
  @Matches(/^[a-zA-Z0-9._-]+$/, {
    message:
      'El alias solo puede contener letras, números y los símbolos . _ -',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  alias?: string;

  @ApiPropertyOptional({ example: '+521234567890' })
  @IsOptional()
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Ingresa un celular en formato E.164, por ejemplo +521234567890',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s-]/g, '') : value,
  )
  phone?: string;

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
