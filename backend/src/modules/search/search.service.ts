import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SearchQuery, SearchResult } from './search.types';

/**
 * Busqueda con PostgreSQL full-text. Los vectores se mantienen con triggers
 * GIN definidos en la migracion, asi que la consulta solo necesita comparar
 * `search_vector @@ websearch_to_tsquery('spanish', q)`.
 *
 * El alcance siempre son los equipos del usuario: la busqueda no puede leer
 * datos de equipos ajenos aunque exista un indice que los alcance.
 */
@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(userId: string, query: SearchQuery): Promise<SearchResult> {
    const teamIds = await this.teamIdsOf(userId);
    const term = query.q.trim();

    if (term.length === 0) {
      return { total: 0, groups: {} };
    }

    const types = query.type
      ? [query.type]
      : (['meetings', 'tasks', 'decisions', 'notes', 'users'] as const);

    const tsQuery = `websearch_to_tsquery('spanish', $1)`;
    const args: unknown[] = [term];
    const groups: SearchResult['groups'] = {};

    const scope = { teamIds, from: query.from, to: query.to };

    const tasks = types.includes('tasks')
      ? await this.searchTasks(args, tsQuery, scope, query)
      : undefined;
    const meetings = types.includes('meetings')
      ? await this.searchMeetings(args, tsQuery, scope, query)
      : undefined;
    const decisions = types.includes('decisions')
      ? await this.searchDecisions(args, tsQuery, scope, query)
      : undefined;
    const notes = types.includes('notes')
      ? await this.searchNotes(args, tsQuery, scope, query)
      : undefined;
    const users = types.includes('users')
      ? await this.searchUsers(args, tsQuery, scope, query)
      : undefined;

    if (tasks) groups.tasks = tasks;
    if (meetings) groups.meetings = meetings;
    if (decisions) groups.decisions = decisions;
    if (notes) groups.notes = notes;
    if (users) groups.users = users;

    return {
      total: Object.values(groups).reduce((sum, list) => sum + list.length, 0),
      groups,
    };
  }

  private async searchTasks(
    args: unknown[],
    tsQuery: string,
    scope: Scope,
    query: SearchQuery,
  ) {
    const params = [...args];
    const conditions = [
      `t.search_vector @@ ${tsQuery}`,
      `t."team_id" = ANY($${push(params, scope.teamIds)}::text[])`,
    ];

    if (query.teamId) {
      conditions.push(`t."team_id" = $${push(params, query.teamId)}`);
    }
    if (query.userId) {
      conditions.push(`t."assignee_id" = $${push(params, query.userId)}`);
    }
    if (query.status) {
      conditions.push(
        `t.status = $${push(params, query.status)}::"TaskStatus"`,
      );
    }
    if (query.priority) {
      conditions.push(
        `t.priority = $${push(params, query.priority)}::"TaskPriority"`,
      );
    }
    if (scope.from || scope.to) {
      conditions.push(rangeCondition('t."created_at"', scope, params));
    }

    return this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        description: string | null;
        status: string;
        priority: string;
        due_date: Date | null;
        team_id: string;
        meeting_id: string | null;
        assignee_id: string | null;
        rank: number;
        created_at: Date;
      }>
    >(
      `SELECT t.id, t.title, t.description, t.status, t.priority,
              t.due_date, t.team_id, t.meeting_id, t.assignee_id,
              t.created_at,
              ts_rank(t.search_vector, ${tsQuery}) AS rank
         FROM tasks t
        WHERE ${conditions.join(' AND ')}
        ORDER BY rank DESC, t."created_at" DESC
        LIMIT $${push(params, query.limit)}`,
      ...params,
    );
  }

  private async searchMeetings(
    args: unknown[],
    tsQuery: string,
    scope: Scope,
    query: SearchQuery,
  ) {
    const params = [...args];
    const conditions = [
      `m.search_vector @@ ${tsQuery}`,
      `m."team_id" = ANY($${push(params, scope.teamIds)}::text[])`,
    ];

    if (query.teamId) {
      conditions.push(`m."team_id" = $${push(params, query.teamId)}`);
    }
    if (query.userId) {
      conditions.push(`m."organizer_id" = $${push(params, query.userId)}`);
    }
    if (query.status) {
      conditions.push(
        `m.status = $${push(params, query.status)}::"MeetingStatus"`,
      );
    }
    if (scope.from || scope.to) {
      conditions.push(rangeCondition('m."start_time"', scope, params));
    }

    return this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        description: string | null;
        status: string;
        team_id: string;
        start_time: Date;
        end_time: Date;
        location: string | null;
        rank: number;
      }>
    >(
      `SELECT m.id, m.title, m.description, m.status, m.team_id,
              m.start_time, m.end_time, m.location,
              ts_rank(m.search_vector, ${tsQuery}) AS rank
         FROM meetings m
        WHERE ${conditions.join(' AND ')}
        ORDER BY rank DESC, m."start_time" DESC
        LIMIT $${push(params, query.limit)}`,
      ...params,
    );
  }

  private async searchDecisions(
    args: unknown[],
    tsQuery: string,
    scope: Scope,
    query: SearchQuery,
  ) {
    const params = [...args];
    // Una decision sin reunion se conserva: es visible si su autor pertenece a
    // uno de los equipos del usuario.
    const conditions = [
      `d.search_vector @@ ${tsQuery}`,
      `(
        m."team_id" = ANY($${push(params, scope.teamIds)}::text[])
        OR EXISTS (
          SELECT 1 FROM team_members tm
           WHERE tm."user_id" = d."author_id"
             AND tm."team_id" = ANY($${push(params, scope.teamIds)}::text[])
        )
      )`,
    ];

    if (query.teamId) {
      conditions.push(
        `(m."team_id" = $${push(params, query.teamId)} OR d."author_id" = ANY(
           SELECT "user_id" FROM team_members WHERE "team_id" = $${push(
             params,
             query.teamId,
           )}))`,
      );
    }
    if (query.userId) {
      conditions.push(`d."author_id" = $${push(params, query.userId)}`);
    }
    if (scope.from || scope.to) {
      conditions.push(rangeCondition('d."created_at"', scope, params));
    }

    return this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        title: string;
        content: string | null;
        meeting_id: string | null;
        team_id: string;
        rank: number;
        created_at: Date;
      }>
    >(
      `SELECT d.id, d.title, d.content, d.meeting_id, m."team_id" AS team_id,
              d.created_at,
              ts_rank(d.search_vector, ${tsQuery}) AS rank
         FROM decisions d
         LEFT JOIN meetings m ON m.id = d."meeting_id"
        WHERE ${conditions.join(' AND ')}
        ORDER BY rank DESC, d."created_at" DESC
        LIMIT $${push(params, query.limit)}`,
      ...params,
    );
  }

  private async searchNotes(
    args: unknown[],
    tsQuery: string,
    scope: Scope,
    query: SearchQuery,
  ) {
    const params = [...args];
    const conditions = [
      `n.search_vector @@ ${tsQuery}`,
      `m."team_id" = ANY($${push(params, scope.teamIds)}::text[])`,
    ];

    if (query.teamId) {
      conditions.push(`m."team_id" = $${push(params, query.teamId)}`);
    }
    if (query.userId) {
      conditions.push(`n."author_id" = $${push(params, query.userId)}`);
    }
    if (scope.from || scope.to) {
      conditions.push(rangeCondition('n."created_at"', scope, params));
    }

    return this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        content: string;
        meeting_id: string | null;
        team_id: string;
        author_id: string;
        rank: number;
        created_at: Date;
      }>
    >(
      `SELECT n.id, n.content, n."meeting_id", m."team_id" AS team_id,
              n."author_id", n.created_at,
              ts_rank(n.search_vector, ${tsQuery}) AS rank
         FROM meeting_notes n
         LEFT JOIN meetings m ON m.id = n."meeting_id"
        WHERE ${conditions.join(' AND ')}
        ORDER BY rank DESC, n."created_at" DESC
        LIMIT $${push(params, query.limit)}`,
      ...params,
    );
  }

  private async searchUsers(
    args: unknown[],
    tsQuery: string,
    scope: Scope,
    query: SearchQuery,
  ) {
    const params = [...args];
    const conditions = [
      `u.search_vector @@ ${tsQuery}`,
      `tm."team_id" = ANY($${push(params, scope.teamIds)}::text[])`,
    ];

    if (query.teamId) {
      conditions.push(`tm."team_id" = $${push(params, query.teamId)}`);
    }
    if (query.userId) {
      conditions.push(`u.id = $${push(params, query.userId)}`);
    }

    return this.prisma.$queryRawUnsafe<
      Array<{
        id: string;
        name: string;
        email: string;
        avatar_url: string | null;
        rank: number;
      }>
    >(
      `SELECT u.id, u.name, u.email, u.avatar_url,
              ts_rank(u.search_vector, ${tsQuery}) AS rank
         FROM users u
         JOIN team_members tm ON tm."user_id" = u.id
        WHERE ${conditions.join(' AND ')}
        GROUP BY u.id
        ORDER BY rank DESC, u.name ASC
        LIMIT $${push(params, query.limit)}`,
      ...params,
    );
  }

  private async teamIdsOf(userId: string): Promise<string[]> {
    const memberships = await this.prisma.teamMember.findMany({
      where: { userId },
      select: { teamId: true },
    });

    return memberships.map((membership) => membership.teamId);
  }
}

type Scope = {
  teamIds: string[];
  from?: Date;
  to?: Date;
};

function push(params: unknown[], value: unknown): number {
  params.push(value);
  return params.length;
}

function rangeCondition(
  column: string,
  scope: Scope,
  params: unknown[],
): string {
  const bounds: string[] = [];

  if (scope.from) {
    bounds.push(`${column} >= $${push(params, scope.from)}`);
  }
  if (scope.to) {
    bounds.push(`${column} <= $${push(params, scope.to)}`);
  }

  return bounds.join(' AND ');
}
