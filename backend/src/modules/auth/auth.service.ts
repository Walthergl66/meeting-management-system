import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash, randomBytes, randomUUID } from 'crypto';
import { AUTH } from '../../shared';
import { RootConfig } from '../../config/configuration';
import { parseDurationToMs } from '../../config/duration';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { composeName } from '../../common/utils/user-name';
import { UserAuthenticatedEvent } from '../../common/events/domain-events';
import { UserEntity, UsersService } from '../users/users.service';
import { ForgotPasswordDto, LoginDto, RegisterDto } from './dto';
import { AUTH_REPOSITORY } from './auth.tokens';
import { AuthRepository } from './auth.repository';

export interface RequestContext {
  ipAddress?: string | null;
  userAgent?: string | null;
}

export interface IssuedTokens {
  accessToken: string;
  expiresIn: number;
  refreshToken: string;
}

/**
 * Hash de una contraseña aleatoria, generado con el mismo coste que las reales
 * (AUTH.BCRYPT_ROUNDS). Solo se usa para igualar el tiempo de respuesta del
 * login cuando el correo no existe; nunca se compara contra un usuario.
 */
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  randomBytes(32).toString('hex'),
  AUTH.BCRYPT_ROUNDS,
);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    @Inject(AUTH_REPOSITORY) private readonly authRepository: AuthRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async register(dto: RegisterDto): Promise<UserEntity> {
    const existing = await this.usersService.findByEmail(dto.email);

    if (existing) {
      throw new ConflictException('El correo ya está registrado');
    }

    const passwordHash = await bcrypt.hash(dto.password, AUTH.BCRYPT_ROUNDS);

    try {
      return await this.usersService.create({
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        alias: dto.alias,
        phone: dto.phone,
        passwordHash,
        timezone: dto.timezone,
      });
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        throw new ConflictException(
          'El alias, el correo o el celular ya están en uso',
        );
      }
      throw error;
    }
  }

  async login(
    dto: LoginDto,
    context: RequestContext = {},
  ): Promise<{ user: UserEntity; tokens: IssuedTokens }> {
    const user = await this.usersService.findByEmail(dto.email);

    // Cuando el correo no existe se compara igualmente contra un hash ficticio:
    // sin esta comparación, el login de un correo inexistente respondía en
    // milisegundos y el de uno existente tardaba lo que tarda bcrypt, lo que
    // permite enumerar qué correos están registrados.
    const passwordMatches = await bcrypt.compare(
      dto.password,
      user?.passwordHash ?? DUMMY_PASSWORD_HASH,
    );

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    await this.usersService.recordLogin(user.id, new Date());

    this.eventEmitter.emit(
      'user.authenticated',
      new UserAuthenticatedEvent(
        user.id,
        context.ipAddress ?? null,
        context.userAgent ?? null,
      ),
    );

    return { user, tokens: await this.issueTokens(user) };
  }

  async refresh(
    rawToken: string | undefined,
  ): Promise<{ user: UserEntity; tokens: IssuedTokens }> {
    if (!rawToken) {
      throw new UnauthorizedException('Refresh token requerido');
    }

    const stored = await this.authRepository.findRefreshToken(
      this.hashOpaqueToken(rawToken),
    );

    if (!stored) {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    if (stored.revokedAt) {
      await this.revokeFamily(stored.tokenFamily);
      this.logger.warn(
        `Reutilización de refresh token detectada; se revocó la sesión ${stored.tokenFamily}`,
      );
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    if (stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token expirado');
    }

    if (!stored.user.isActive) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    await this.authRepository.revokeRefreshToken(stored.id, new Date());

    const user: UserEntity = { ...stored.user, name: composeName(stored.user) };

    return {
      user,
      tokens: await this.issueTokens(user, stored.tokenFamily),
    };
  }

  private async revokeFamily(tokenFamily: string): Promise<void> {
    await this.authRepository.revokeRefreshTokenFamily(tokenFamily, new Date());
  }

  async logout(
    rawToken: string | undefined,
    context: RequestContext = {},
  ): Promise<void> {
    if (!rawToken) {
      return;
    }

    const stored = await this.authRepository.findRefreshTokenSession(
      this.hashOpaqueToken(rawToken),
    );

    if (!stored) {
      return;
    }

    await this.revokeFamily(stored.tokenFamily);

    this.eventEmitter.emit(
      'user.logged_out',
      new UserAuthenticatedEvent(
        stored.userId,
        context.ipAddress ?? null,
        context.userAgent ?? null,
      ),
    );
  }

  async logoutAll(userId: string): Promise<void> {
    await this.authRepository.revokeAllRefreshTokens(userId, new Date());
  }

  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      this.logger.warn(
        `Reset solicitado para correo inexistente: ${dto.email}`,
      );
      return;
    }

    const rawToken = this.generateOpaqueToken();
    const expiresAt = new Date(
      Date.now() + parseDurationToMs(AUTH.RESET_TOKEN_EXPIRES_IN),
    );

    await this.authRepository.replacePasswordResetToken(
      user.id,
      this.hashOpaqueToken(rawToken),
      expiresAt,
    );

    this.logger.warn(
      `Token de reset creado para ${user.email} y expira en ${expiresAt.toISOString()}`,
    );

    // El correo se conecta en la FASE 10. Mientras tanto, fuera de produccion
    // el token se registra para poder completar el flujo a mano.
    if (!this.configService.get('app', { infer: true }).isProduction) {
      this.logger.warn(`Token de reset (solo desarrollo): ${rawToken}`);
    }
  }

  async resetPassword(token: string, password: string): Promise<void> {
    const resetToken = await this.authRepository.findPasswordResetToken(
      this.hashOpaqueToken(token),
    );

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt < new Date()) {
      throw new UnauthorizedException(
        'Token de restablecimiento inválido o expirado',
      );
    }

    // El early return anterior evita el UPDATE en el caso obvio, pero no protege
    // contra la carrera: dos peticiones concurrentes pueden pasar las dos la
    // comprobacion. El consumo real se hace con una condicion atomica sobre
    // usedAt, de forma que solo una puede ganar.
    const consumed = await this.authRepository.consumePasswordResetToken(
      resetToken.id,
      new Date(),
    );

    if (consumed !== 1) {
      throw new UnauthorizedException(
        'Token de restablecimiento inválido o expirado',
      );
    }

    await this.usersService.updatePasswordHash(
      resetToken.userId,
      await bcrypt.hash(password, AUTH.BCRYPT_ROUNDS),
    );

    await this.logoutAll(resetToken.userId);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.usersService.findActiveById(userId);
    const matches = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!matches) {
      throw new UnauthorizedException('La contraseña actual no es correcta');
    }

    await this.usersService.updatePasswordHash(
      userId,
      await bcrypt.hash(newPassword, AUTH.BCRYPT_ROUNDS),
    );

    await this.logoutAll(userId);
  }

  async issueSession(user: UserEntity): Promise<IssuedTokens> {
    return this.issueTokens(user);
  }

  private async issueTokens(
    user: UserEntity,
    tokenFamily: string = randomUUID(),
  ): Promise<IssuedTokens> {
    const { secret, expiresIn, refreshExpiresInMs } = this.configService.get(
      'jwt',
      { infer: true },
    );

    const accessToken = await this.jwtService.signAsync(
      { sub: user.id, email: user.email, type: 'access' },
      { secret, expiresIn },
    );

    const refreshToken = this.generateOpaqueToken();

    await this.authRepository.createRefreshToken({
      // Se guarda el hash, no el token: una lectura de la tabla no debe
      // bastar para robar una sesion.
      token: this.hashOpaqueToken(refreshToken),
      tokenFamily,
      userId: user.id,
      expiresAt: new Date(Date.now() + refreshExpiresInMs),
    });

    return {
      accessToken,
      expiresIn,
      refreshToken,
    };
  }

  private generateOpaqueToken(): string {
    return randomBytes(48).toString('hex');
  }

  private hashOpaqueToken(rawToken: string): string {
    return createHash('sha256').update(rawToken).digest('hex');
  }
}
