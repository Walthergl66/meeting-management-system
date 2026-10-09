export interface UserNameFields {
  firstName: string;
  lastName: string;
}

/**
 * Compone el nombre para mostrar a partir de first_name y last_name.
 * Se mantiene como el único punto donde se arma, para que el nombre
 * compuesto sea consistente en todos los presenters.
 */
export function composeName(user: UserNameFields): string {
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
}
