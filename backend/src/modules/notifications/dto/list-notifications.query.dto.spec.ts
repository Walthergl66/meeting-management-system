import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { ListNotificationsQueryDto } from './list-notifications.query.dto';

const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
});

const check = (query: Record<string, unknown>) =>
  pipe.transform(query, { type: 'query', metatype: ListNotificationsQueryDto });

describe('ListNotificationsQueryDto', () => {
  it('deja read indefinido cuando no llega', async () => {
    const dto = await check({});
    expect(dto.read).toBeUndefined();
  });

  it('entrega el texto sin convertirlo, para no perder el false', async () => {
    // Convertir aquí por truthiness convertiría 'false' en true.
    expect((await check({ read: 'false' })).read).toBe('false');
  });

  it.each(['true', 'false'])('acepta read=%s', async (entrada) => {
    const dto = await check({ read: entrada });
    expect(dto.read).toBe(entrada);
  });

  it('rechaza cualquier otro texto en lugar de asumir false', async () => {
    // Antes: `read !== undefined ? read === 'true' : undefined` convertía
    // cualquier otra cosa (incluido '1' o '') en false, y el filtro salía mal
    // sin avisar. Ahora es un 422.
    await expect(check({ read: 'si' })).rejects.toThrow();
    await expect(check({ read: '1' })).rejects.toThrow();
    await expect(check({ read: '' })).rejects.toThrow();
  });

  it('rechaza un parámetro desconocido', async () => {
    await expect(check({ unread: 'true' })).rejects.toThrow();
  });
});
