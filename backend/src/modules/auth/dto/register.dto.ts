import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { MaxBcryptBytes } from '../../../common/validators/max-bcrypt-bytes.validator';
import { AUTH } from '../../../shared';

export class RegisterDto {
  @ApiProperty({ example: 'ana@correo.com' })
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;

  @ApiProperty({ example: 'Ana', minLength: 1, maxLength: 60 })
  @IsString()
  @MinLength(1, { message: 'El nombre es obligatorio' })
  @MaxLength(60, { message: 'El nombre no puede superar los 60 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  firstName: string;

  @ApiProperty({ example: 'García López', minLength: 1, maxLength: 60 })
  @IsString()
  @MinLength(1, { message: 'El apellido es obligatorio' })
  @MaxLength(60, { message: 'El apellido no puede superar los 60 caracteres' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  lastName: string;

  @ApiProperty({
    example: 'ana_garcia',
    minLength: 2,
    maxLength: 30,
    description: 'Apodo único en la plataforma',
  })
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
  alias: string;

  @ApiProperty({
    example: '+521234567890',
    description: 'Celular en formato E.164 (con código de país)',
  })
  @IsString()
  @Matches(/^\+[1-9]\d{1,14}$/, {
    message: 'Ingresa un celular en formato E.164, por ejemplo +521234567890',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/[\s-]/g, '') : value,
  )
  phone: string;

  @ApiProperty({
    example: 'Meetflow123!',
    minLength: AUTH.PASSWORD_MIN_LENGTH,
    maxLength: AUTH.PASSWORD_MAX_LENGTH,
  })
  @IsString()
  @MinLength(AUTH.PASSWORD_MIN_LENGTH, {
    message: `La contraseña debe tener al menos ${AUTH.PASSWORD_MIN_LENGTH} caracteres`,
  })
  @MaxBcryptBytes()
  password: string;

  @ApiPropertyOptional({
    example: 'America/Mexico_City',
    description: 'Zona horaria IANA',
  })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;
}
