import { ApiProperty } from '@nestjs/swagger';

export class UserProfileDto {
  @ApiProperty({ example: 'clx1234567890' })
  id: string;

  @ApiProperty({ example: 'ana@correo.com' })
  email: string;

  @ApiProperty({ example: 'Ana Propietaria' })
  name: string;

  @ApiProperty({ example: null, nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ example: 'America/Mexico_City' })
  timezone: string;

  @ApiProperty({ example: 'es' })
  locale: string;

  @ApiProperty({ example: '2026-10-01T16:00:00.000Z' })
  createdAt: Date;
}

export class AuthTokensDto {
  @ApiProperty({ description: 'JWT de acceso (15 minutos)' })
  accessToken: string;

  @ApiProperty({
    example: 900,
    description: 'Segundos de vigencia del access token',
  })
  expiresIn: number;

  @ApiProperty({
    description: 'El refresh token viaja en la cookie HttpOnly refresh_token',
  })
  tokenType: 'Bearer';
}

export class AuthResponseDto {
  @ApiProperty({ type: UserProfileDto })
  user: UserProfileDto;

  @ApiProperty({ type: AuthTokensDto })
  tokens: AuthTokensDto;
}

export class MessageResponseDto {
  @ApiProperty({ example: 'Contraseña actualizada correctamente' })
  message: string;
}
