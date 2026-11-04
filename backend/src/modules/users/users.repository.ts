import type { UserEntity, UserRecord } from './users.types';

export interface CreateUserRecord {
  email: string;
  firstName: string;
  lastName: string;
  alias: string;
  phone: string;
  passwordHash: string;
  timezone?: string;
}

export type UpdateUserRecord = Partial<
  Pick<
    UserEntity,
    | 'firstName'
    | 'lastName'
    | 'alias'
    | 'phone'
    | 'timezone'
    | 'locale'
    | 'avatarUrl'
    | 'passwordHash'
  >
>;

export class UserUniqueConstraintError extends Error {
  constructor() {
    super('La operación infringe una restricción única de usuario');
    this.name = 'UserUniqueConstraintError';
  }
}

export interface UsersRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(data: CreateUserRecord): Promise<UserRecord>;
  update(id: string, data: UpdateUserRecord): Promise<UserRecord>;
  recordLogin(id: string, at: Date): Promise<void>;
}
