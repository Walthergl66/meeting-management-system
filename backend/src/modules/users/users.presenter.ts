import { UserProfileDto } from '../../modules/auth/dto';
import { composeName } from '../../common/utils/user-name';

type UserLike = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  alias: string;
  phone: string;
  avatarUrl: string | null;
  timezone: string;
  locale: string;
  createdAt: Date;
};

export function toUserProfile(user: UserLike): UserProfileDto {
  return {
    id: user.id,
    email: user.email,
    name: composeName(user),
    firstName: user.firstName,
    lastName: user.lastName,
    alias: user.alias,
    phone: user.phone,
    avatarUrl: user.avatarUrl,
    timezone: user.timezone,
    locale: user.locale,
    createdAt: user.createdAt,
  };
}
