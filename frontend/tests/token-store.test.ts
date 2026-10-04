import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { tokenStore } from '@/lib/auth/token-store';

// tokenStore guarda una copia en memoria además de sessionStorage, así que
// cada test empieza limpiando ambas.
const CLAVE = 'meetflow.access_token';

describe('tokenStore en el navegador', () => {
  let storage: Storage;
  let getItem: ReturnType<typeof vi.fn>;
  let setItem: ReturnType<typeof vi.fn>;
  let removeItem: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getItem = vi.fn();
    setItem = vi.fn();
    removeItem = vi.fn();

    storage = {
      getItem,
      setItem,
      removeItem,
      clear: vi.fn(),
      key: vi.fn(),
      length: 0,
    } as unknown as Storage;

    vi.stubGlobal('window', { sessionStorage: storage });
    tokenStore.set(null);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('arranca sin token', () => {
    expect(tokenStore.get()).toBeNull();
  });

  it('guarda el token en memoria y en la sesión', () => {
    tokenStore.set('abc.def.ghi');

    expect(tokenStore.get()).toBe('abc.def.ghi');
    expect(setItem).toHaveBeenCalledWith(CLAVE, 'abc.def.ghi');
  });

  it('recupera el token tras recargar la página', () => {
    // hydrate es lo que llama el cliente HTTP: si no leyera la sesión, cada
    // recarga mandaría las peticiones sin Authorization.
    getItem.mockReturnValue('token.persistente');

    expect(tokenStore.hydrate()).toBe('token.persistente');
    expect(tokenStore.get()).toBe('token.persistente');
  });

  it('no vuelve a leer la sesión si ya tiene el token en memoria', () => {
    tokenStore.set('en.memoria');

    expect(tokenStore.hydrate()).toBe('en.memoria');
    expect(getItem).not.toHaveBeenCalled();
  });

  it('borrar el token también limpia la sesión', () => {
    tokenStore.set('a.borrar');
    getItem.mockClear();

    tokenStore.set(null);

    expect(tokenStore.get()).toBeNull();
    expect(removeItem).toHaveBeenCalledWith(CLAVE);
  });

  it('no falla al arrancar en el servidor, donde no hay window', () => {
    vi.stubGlobal('window', undefined);

    expect(() => tokenStore.set('sin.window')).not.toThrow();
    expect(tokenStore.get()).toBe('sin.window');
    expect(tokenStore.hydrate()).toBe('sin.window');

    tokenStore.set(null);
  });
});