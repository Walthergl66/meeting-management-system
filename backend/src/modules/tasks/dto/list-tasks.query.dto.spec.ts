import { HttpStatus, ValidationPipe } from '@nestjs/common';
import { TaskPriority, TaskStatus } from '../../../shared';
import { ListTasksQueryDto } from './list-tasks.query.dto';

/**
 * Se usa el mismo ValidationPipe global de la aplicación
 * (common/configure-app.ts) para que el test mida lo mismo que en producción:
 * whitelist, forbidNonWhitelisted y transformación implícita.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { enableImplicitConversion: true },
  errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
});

const check = (query: Record<string, unknown>) =>
  pipe.transform(query, { type: 'query', metatype: ListTasksQueryDto });

describe('ListTasksQueryDto', () => {
  it('acepta una consulta vacía', async () => {
    // Sin @IsOptional() en cada campo, class-validator valida los undefined y
    // una petición sin filtros devolvía 422 en lugar de la lista completa.
    const dto = await check({});
    expect(dto).toEqual({});
  });

  it('acepta solo uno de los filtros opcionales', async () => {
    await expect(check({ teamId: 'team_1' })).resolves.toMatchObject({
      teamId: 'team_1',
    });
    await expect(check({ status: TaskStatus.DONE })).resolves.toMatchObject({
      status: TaskStatus.DONE,
    });
  });

  it('acepta los filtros documentados con valores válidos', async () => {
    const dto = await check({
      teamId: 'team_1',
      status: TaskStatus.TODO,
      priority: TaskPriority.HIGH,
      assigneeId: 'usr_1',
      meetingId: 'mtg_1',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-12-31T00:00:00.000Z',
    });

    expect(dto).toMatchObject({ status: TaskStatus.TODO });
  });

  it('rechaza un estado que no pertenece al enum', async () => {
    await expect(check({ status: 'inventado' })).rejects.toThrow();
  });

  it('rechaza una prioridad que no pertenece al enum', async () => {
    await expect(check({ priority: 'urgentisimo' })).rejects.toThrow();
  });

  it('rechaza una fecha ilegible en lugar de dejar un Invalid Date', async () => {
    // El controlador hacía new Date('ayer') y Prisma recibía una fecha inválida,
    // que salía como 500.
    await expect(check({ from: 'ayer' })).rejects.toThrow();
    await expect(check({ to: '31/12/2026' })).rejects.toThrow();
  });

  it('rechaza un parámetro desconocido', async () => {
    await expect(check({ limite: '1000' })).rejects.toThrow();
  });

  it('acota la longitud de los identificadores', async () => {
    await expect(check({ teamId: 'a'.repeat(65) })).rejects.toThrow();
  });
});
