import { createHash } from 'crypto';

/**
 * Cuerpo de POST /auth/register para los e2e. El alias y el celular derivan del
 * correo (ya único vía randomUUID por registro) con un hash SHA-256, para que
 * nunca colisionen entre registros ni entre ejecuciones:
 * el alias no puede compartirse y el celular debe ser un E.164.
 */
export const registerBody = (email: string, password = 'Meetflow123!') => {
  const digest = createHash('sha256').update(email).digest('hex');

  return {
    email,
    firstName: 'Usuario',
    lastName: 'E2E',
    alias: `u-${digest.slice(0, 18)}`,
    phone: `+1${digest.replace(/\D/g, '').slice(0, 9)}`,
    password,
  };
};
