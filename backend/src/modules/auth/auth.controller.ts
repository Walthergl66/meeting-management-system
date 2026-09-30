import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiTooManyRequestsResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Response } from 'express';
import { AUTH } from '@meetflow/config';
import { Public } from '../../common/decorators/public.decorator';
import { RootConfig } from '../../config/configuration';
import { AuthService } from './auth.service';
import {
  AuthResponseDto,
  ForgotPasswordDto,
  LoginDto,
  MessageResponseDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
} from './dto';
import { toUserProfile } from '../users/users.presenter';

export const REFRESH_TOKEN_COOKIE = 'refresh_token';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<RootConfig, true>,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Crea una cuenta y devuelve los tokens de sesión' })
  @ApiCreatedResponse({ type: AuthResponseDto })
  @ApiConflictResponse({ description: 'El correo ya está registrado' })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.register(dto);
    const tokens = await this.authService.issueSession(user);

    this.setRefreshCookie(res, tokens.refreshToken);

    return {
      user: toUserProfile(user),
      tokens: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer' as const,
      },
    };
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: AUTH.LOGIN_RATE_LIMIT.limit,
      ttl: AUTH.LOGIN_RATE_LIMIT.ttl,
    },
  })
  @ApiOperation({ summary: 'Inicia sesión y devuelve los tokens de sesión' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({ description: 'Credenciales inválidas' })
  @ApiTooManyRequestsResponse({ description: 'Demasiados intentos de login' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, tokens } = await this.authService.login(dto);

    this.setRefreshCookie(res, tokens.refreshToken);

    return {
      user: toUserProfile(user),
      tokens: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer' as const,
      },
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Renueva el access token con el refresh token' })
  @ApiOkResponse({ type: AuthResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Refresh token inválido, expirado o revocado',
  })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawToken = dto.refreshToken ?? this.readRefreshCookie(res);
    const { user, tokens } = await this.authService.refresh(rawToken);

    this.setRefreshCookie(res, tokens.refreshToken);

    return {
      user: toUserProfile(user),
      tokens: {
        accessToken: tokens.accessToken,
        expiresIn: tokens.expiresIn,
        tokenType: 'Bearer' as const,
      },
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Revoca el refresh token de la sesión actual' })
  @ApiOkResponse({ type: MessageResponseDto })
  async logout(
    @Body() dto: RefreshTokenDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(
      dto.refreshToken ?? this.readRefreshCookie(res),
    );
    this.clearRefreshCookie(res);

    return { message: 'Sesión cerrada correctamente' };
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({
    default: {
      limit: AUTH.FORGOT_PASSWORD_RATE_LIMIT.limit,
      ttl: AUTH.FORGOT_PASSWORD_RATE_LIMIT.ttl,
    },
  })
  @ApiOperation({ summary: 'Solicita el restablecimiento de contraseña' })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiTooManyRequestsResponse({
    description: 'Demasiadas solicitudes de reset',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto);

    return {
      message:
        'Si el correo existe, recibirás las instrucciones para restablecer tu contraseña',
    };
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Establece una nueva contraseña con el token recibido',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Token inválido o expirado' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto.token, dto.password);

    return { message: 'Contraseña actualizada correctamente' };
  }

  private readRefreshCookie(res: Response): string | undefined {
    const cookies = (
      res as unknown as { req?: { cookies?: Record<string, string> } }
    ).req?.cookies;

    return cookies?.[REFRESH_TOKEN_COOKIE];
  }

  private setRefreshCookie(res: Response, token: string): void {
    const isProduction = this.configService.get('app', {
      infer: true,
    }).isProduction;

    res.cookie(REFRESH_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: isProduction,
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/auth' });
  }
}
