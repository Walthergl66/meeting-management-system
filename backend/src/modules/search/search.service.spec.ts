import { Test, TestingModule } from '@nestjs/testing';
import { MeetingStatus, TaskPriority, TaskStatus } from '../../shared';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchService } from './search.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: {
    teamMember: { findMany: jest.Mock };
    $queryRawUnsafe: jest.Mock;
  };

  const rows: unknown[] = [];
  const lastQuery = () => prisma.$queryRawUnsafe.mock.calls.at(-1);

  beforeEach(async () => {
    rows.length = 0;
    prisma = {
      teamMember: { findMany: jest.fn().mockResolvedValue([]) },
      $queryRawUnsafe: jest.fn().mockResolvedValue(rows),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(SearchService);
  });

  it('no consulta si el término está vacío', async () => {
    const result = await service.search('usr_1', { q: '   ', limit: 20 });

    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
    expect(result).toEqual({ total: 0, groups: {} });
  });

  it('devuelve 0 resultados cuando el usuario no pertenece a ningún equipo', async () => {
    await service.search('usr_1', { q: 'reunión', limit: 20 });

    const [sql, ...params] = lastQuery();
    expect(sql).toContain('::text[]');
    expect(params[1]).toEqual([]);
  });

  it('consulta las cinco entidades cuando no se filtra por tipo', async () => {
    await service.search('usr_1', { q: 'plan', limit: 20 });

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(5);
  });

  it('solo consulta el tipo solicitado', async () => {
    await service.search('usr_1', { q: 'plan', type: 'meetings', limit: 20 });

    expect(prisma.$queryRawUnsafe).toHaveBeenCalledTimes(1);
    expect(lastQuery()[0]).toContain('FROM meetings m');
  });

  it('usa el mismo índice de parámetros para el término y los filtros', async () => {
    await service.search('usr_1', {
      q: 'plan',
      type: 'tasks',
      teamId: 'team_1',
      status: TaskStatus.DONE,
      priority: TaskPriority.HIGH,
      from: new Date('2026-10-01T00:00:00.000Z'),
      to: new Date('2026-10-31T00:00:00.000Z'),
      limit: 7,
    });

    const [sql, ...params] = lastQuery();
    // $1 es siempre el término; el resto se numera correlativamente.
    expect(sql).toContain("websearch_to_tsquery('spanish', $1)");
    expect(params).toEqual([
      'plan',
      [],
      'team_1',
      TaskStatus.DONE,
      TaskPriority.HIGH,
      new Date('2026-10-01T00:00:00.000Z'),
      new Date('2026-10-31T00:00:00.000Z'),
      7,
    ]);
  });

  it('aplica el filtro de estado como enum de la entidad correcta', async () => {
    await service.search('usr_1', {
      q: 'plan',
      type: 'meetings',
      status: MeetingStatus.CANCELLED,
      limit: 20,
    });

    expect(lastQuery()[0]).toContain('m.status = $3::"MeetingStatus"');
  });

  it('conserva las decisiones sin reunión si su autor comparte equipo', async () => {
    await service.search('usr_1', { q: 'plan', type: 'decisions', limit: 20 });

    const sql = lastQuery()[0];
    expect(sql).toContain('LEFT JOIN meetings m');
    expect(sql).toContain('EXISTS (');
    expect(sql).toContain('FROM team_members tm');
  });

  it('resume el total sumando los grupos devueltos', async () => {
    prisma.teamMember.findMany.mockResolvedValue([{ teamId: 'team_1' }]);
    // El servicio consulta en orden: tareas, reuniones, decisiones, notas, usuarios.
    prisma.$queryRawUnsafe
      .mockResolvedValueOnce([{ id: 't1' }])
      .mockResolvedValueOnce([{ id: 'm1' }, { id: 'm2' }])
      .mockResolvedValue([]);

    const result = await service.search('usr_1', { q: 'plan', limit: 20 });

    expect(result.groups.meetings).toHaveLength(2);
    expect(result.groups.tasks).toHaveLength(1);
    expect(result.total).toBe(3);
  });

  it('omite los grupos no solicitados en la respuesta', async () => {
    await service.search('usr_1', { q: 'plan', type: 'tasks', limit: 20 });

    const result = await service.search('usr_1', {
      q: 'plan',
      type: 'tasks',
      limit: 20,
    });

    expect(Object.keys(result.groups)).toEqual(['tasks']);
  });
});
