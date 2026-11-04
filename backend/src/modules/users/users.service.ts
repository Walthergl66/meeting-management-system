import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { composeName } from '../../common/utils/user-name';
import { USERS_REPOSITORY } from './users.tokens';
import {
  CreateUserRecord,
  UpdateUserRecord,
  UserUniqueConstraintError,
  UsersRepository,
} from './users.repository';
import { UserEntity, UserRecord } from './users.types';

export type { UserEntity } from './users.types';

const toEntity = (row: UserRecord): UserEntity => ({
  ...row,
  name: composeName(row),
});

@Injectable()
export class UsersService {
  constructor(
    @Inject(USERS_REPOSITORY) private readonly usersRepository: UsersRepository,
  ) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.usersRepository.findByEmail(email);
    return user ? toEntity(user) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    const user = await this.usersRepository.findById(id);
    return user ? toEntity(user) : null;
  }

  async findActiveById(id: string): Promise<UserEntity> {
    const user = await this.usersRepository.findById(id);

    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('La cuenta está desactivada');
    }

    return toEntity(user);
  }

  async create(data: CreateUserRecord): Promise<UserEntity> {
    try {
      const user = await this.usersRepository.create(data);
      return toEntity(user);
    } catch (error) {
      if (error instanceof UserUniqueConstraintError) {
        throw new ConflictException(
          'El alias, el correo o el celular ya están en uso',
        );
      }
      throw error;
    }
  }

  async update(id: string, data: UpdateUserRecord): Promise<UserEntity> {
    try {
      const user = await this.usersRepository.update(id, data);
      return toEntity(user);
    } catch (error) {
      if (error instanceof UserUniqueConstraintError) {
        throw new ConflictException(
          'El alias, el correo o el celular ya están en uso',
        );
      }
      throw error;
    }
  }

  async updatePasswordHash(
    id: string,
    passwordHash: string,
  ): Promise<UserEntity> {
    const user = await this.usersRepository.update(id, { passwordHash });
    return toEntity(user);
  }

  async recordLogin(id: string, at: Date): Promise<void> {
    await this.usersRepository.recordLogin(id, at);
  }
}
