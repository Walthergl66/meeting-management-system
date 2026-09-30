import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { AUTH } from '@meetflow/config';

export class ForgotPasswordDto {
  @ApiProperty({ example: 'ana@correo.com' })
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  @MaxLength(255)
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Token recibido por correo' })
  @IsString()
  @MinLength(1, { message: 'El token es obligatorio' })
  token: string;

  @ApiProperty({
    example: 'NuevaClave123!',
    minLength: AUTH.PASSWORD_MIN_LENGTH,
  })
  @IsString()
  @MinLength(AUTH.PASSWORD_MIN_LENGTH, {
    message: `La contraseña debe tener al menos ${AUTH.PASSWORD_MIN_LENGTH} caracteres`,
  })
  password: string;
}
