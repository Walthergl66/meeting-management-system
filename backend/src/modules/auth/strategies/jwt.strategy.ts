import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../../common/types/authenticated-user';
import { RootConfig } from '../../../config/configuration';
import { UsersService } from '../../users/users.service';

export interface JwtPayload {
  /** También opcional: hasta validate() no se sabe si el token lo trae. */
  sub?: string;
  email: string;
  /**
   * Claim sin validar: viene del token firmado, no del código. Declararlo como
   * 'access' hacía creer que ya estaba garantizado, cuando en realidad un token
   * con otro tipo se aceptaba igual. Se tipa como texto opcional y decide
   * validate().
   */
  type?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService<RootConfig, true>,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('jwt', { infer: true }).secret,
      // Se fija el algoritmo: sin esto jsonwebtoken acepta cualquiera que sea
      // compatible con un secreto compartido.
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    if (payload.type !== 'access' || !payload.sub) {
      throw new UnauthorizedException('Token no válido');
    }

    const user = await this.usersService.findActiveById(payload.sub);

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      timezone: user.timezone,
    };
  }
}
