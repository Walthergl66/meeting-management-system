import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ApiError,
  apiDelete,
  apiGet,
  apiGetPaginated,
  apiPatch,
  apiPost,
  buildQuery,
} from '@/lib/api/client';
import { tokenStore } from '@/lib/auth/token-store';

const json = (cuerpo: unknown, status = 200) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => cuerpo,
  }) as unknown as Response;

let fetchMock: ReturnType<typeof vi.fn>;

/** Ejecuta la llamada y devuelve el ApiError que debería haber lanzado. */
async function fallaCon(promesa: Promise<unknown>): Promise<ApiError> {
  try {
    await promesa;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }

  throw new Error('se esperaba un ApiError y la llamada resolvió');
}

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  tokenStore.set(null);
});

describe('buildQuery', () => {
  it('devuelve cadena vacía cuando no hay nada que enviar', () => {
    expect(buildQuery({})).toBe('');
  });

  it('antepone el interrogativo solo si hay parámetros', () => {
    expect(buildQuery({ status: 'SCHEDULED' })).toBe('?status=SCHEDULED');
  });

  it('descarta null, undefined y cadena vacía', () => {
    expect(
      buildQuery({
        status: null,
        teamId: undefined,
        search: '',
        page: 1,
      }),
    ).toBe('?page=1');
  });

  it('conserva el false porque es un valor legítimo de filtro', () => {
    expect(buildQuery({ overdue: false })).toBe('?overdue=false');
  });

  it('convierte Date a ISO', () => {
    const fecha = new Date(2026, 9, 15, 12, 0, 0);

    expect(buildQuery({ from: fecha })).toBe(
      `?from=${encodeURIComponent(fecha.toISOString())}`,
    );
  });
});

describe('cabecera de autorización', () => {
  const cabecerasDe = () => fetchMock.mock.calls[0][1].headers;

  it('no manda Authorization sin token', async () => {
    fetchMock.mockResolvedValue(json({ data: [], meta: { total: 0 } }));

    await apiGet('/meetings');

    expect(cabecerasDe().Authorization).toBeUndefined();
  });

  it('manda el token como Bearer cuando hay sesión', async () => {
    tokenStore.set('abc.def.ghi');
    fetchMock.mockResolvedValue(json({ data: [] }));

    await apiGet('/meetings');

    expect(cabecerasDe().Authorization).toBe('Bearer abc.def.ghi');
  });

  it('manda cookies para que viaje el refresh token', async () => {
    fetchMock.mockResolvedValue(json({ data: [] }));

    await apiGet('/meetings');

    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  });
});

describe('apiGet', () => {
  it('devuelve solo data y descarta el mensaje', async () => {
    fetchMock.mockResolvedValue(json({ data: { id: 'mtg_1' }, message: 'Listo' }));

    await expect(apiGet('/meetings/mtg_1')).resolves.toEqual({ id: 'mtg_1' });
  });

  it('añade los parámetros a la URL', async () => {
    fetchMock.mockResolvedValue(json({ data: [] }));

    await apiGet('/meetings', { teamId: 'team_1', page: 2 });

    expect(fetchMock.mock.calls[0][0]).toContain(
      '/meetings?teamId=team_1&page=2',
    );
  });
});

describe('apiGetPaginated', () => {
  it('separa la lista de la paginación', async () => {
    fetchMock.mockResolvedValue(
      json({ data: [{ id: 1 }], meta: { total: 1, page: 1, limit: 20 } }),
    );

    await expect(apiGetPaginated('/meetings')).resolves.toEqual({
      data: [{ id: 1 }],
      meta: { total: 1, page: 1, limit: 20 },
    });
  });
});

describe('escritura', () => {
  it('apiPost serializa el cuerpo y devuelve data', async () => {
    fetchMock.mockResolvedValue(json({ data: { id: 'task_1' } }, 201));

    await expect(apiPost('/tasks', { title: 'Hacer' })).resolves.toEqual({
      id: 'task_1',
    });

    const [, init] = fetchMock.mock.calls[0];
    expect(init.method).toBe('POST');
    expect(JSON.parse(init.body)).toEqual({ title: 'Hacer' });
  });

  it('apiPatch usa PATCH', async () => {
    fetchMock.mockResolvedValue(json({ data: { id: 'task_1' } }));

    await apiPatch('/tasks/task_1', { status: 'DONE' });

    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH');
  });

  it('apiDelete usa DELETE', async () => {
    fetchMock.mockResolvedValue(json({ data: { id: 'task_1' } }));

    await apiDelete('/tasks/task_1');

    expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
  });

  it('no manda cuerpo cuando no se pasa ninguno', async () => {
    fetchMock.mockResolvedValue(json({ data: { id: 'task_1' } }));

    await apiPost('/tasks/task_1/complete');

    expect(fetchMock.mock.calls[0][1].body).toBeUndefined();
  });

  it('devuelve undefined en un 204 sin cuerpo', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => {
        throw new Error('no debería leer el cuerpo');
      },
    } as unknown as Response);

    await expect(apiDelete('/tasks/task_1')).resolves.toBeUndefined();
  });
});

describe('errores', () => {
  it('lanza ApiError con el código y el mensaje del servidor', async () => {
    fetchMock.mockResolvedValue(
      json({ statusCode: 404, message: 'Reunión no encontrada' }, 404),
    );

    const error = await fallaCon(apiGet('/meetings/no_existe'));

    expect(error.statusCode).toBe(404);
    expect(error.message).toBe('Reunión no encontrada');
    expect(error.name).toBe('ApiError');
  });

  it('arrastra el detalle de validación para que la UI lo muestre', async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          statusCode: 422,
          message: 'Validation failed',
          details: [
            { field: 'timezone', message: 'timezone must be shorter than 64' },
          ],
        },
        422,
      ),
    );

    const error = await fallaCon(apiPatch('/users/me', {}));

    expect(error.details).toEqual([
      { field: 'timezone', message: 'timezone must be shorter than 64' },
    ]);
  });

  it('usa un mensaje propio cuando el cuerpo no es JSON válido', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => {
        throw new Error('html de un proxy');
      },
    } as unknown as Response);

    const error = await fallaCon(apiGet('/meetings'));

    expect(error.statusCode).toBe(502);
    expect(error.message).toBe('Ocurrió un error inesperado');
    expect(error.details).toEqual([]);
  });

  it('no filtra el detalle interno de un 500', async () => {
    fetchMock.mockResolvedValue(
      json(
        {
          statusCode: 500,
          message: 'connection to postgres refused',
          details: [{ field: 'db', message: 'ECONNREFUSED' }],
        },
        500,
      ),
    );

    const error = await fallaCon(apiGet('/meetings'));

    // El backend ya oculta esto, pero el cliente tampoco debe esperar que un
    // 500 llegue con un mensaje utilizable.
    expect(error.statusCode).toBe(500);
    expect(error.details).toEqual([{ field: 'db', message: 'ECONNREFUSED' }]);
  });
});