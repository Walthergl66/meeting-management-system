import { describe, expect, it } from 'vitest';
import { TeamAction, TEAM_PERMISSIONS, roleCan } from '../lib/shared/permissions';
import { TeamRole, TEAM_ROLES } from '../lib/shared/enums';

/**
 * El backend es la fuente de verdad de los permisos y su copia en
 * frontend/lib/shared/permissions.ts está duplicada a propósito. Estos tests no
 * comprueban que la copia sea correcta, sino que no se puede editar sin que se
 * note: si alguien cambia una regla aquí, falla el test y hay que ir también al
 * backend/src/shared/permissions.ts.
 */
describe('matriz de permisos del equipo (espejo del backend)', () => {
  it('cubre todos los roles para cada acción', () => {
    for (const accion of Object.values(TeamAction)) {
      expect(TEAM_PERMISSIONS[accion].length).toBeGreaterThan(0);

      for (const rol of TEAM_PERMISSIONS[accion]) {
        expect(TEAM_ROLES).toContain(rol);
      }
    }
  });

  it('solo el propietario puede transferir la propiedad y borrar el equipo', () => {
    expect(TEAM_PERMISSIONS[TeamAction.TRANSFER_OWNERSHIP]).toEqual([
      TeamRole.OWNER,
    ]);
    expect(TEAM_PERMISSIONS[TeamAction.DELETE_TEAM]).toEqual([TeamRole.OWNER]);
  });

  it('editar el equipo, invitar y quitar miembros son de propietario o admin', () => {
    expect(TEAM_PERMISSIONS[TeamAction.EDIT_TEAM]).toEqual([
      TeamRole.OWNER,
      TeamRole.ADMIN,
    ]);
    expect(TEAM_PERMISSIONS[TeamAction.INVITE_MEMBERS]).toEqual([
      TeamRole.OWNER,
      TeamRole.ADMIN,
    ]);
    expect(TEAM_PERMISSIONS[TeamAction.REMOVE_MEMBER]).toEqual([
      TeamRole.OWNER,
      TeamRole.ADMIN,
    ]);
  });

  it('gestionar agenda y participantes no incluye a los miembros', () => {
    expect(TEAM_PERMISSIONS[TeamAction.MANAGE_AGENDA]).toEqual([
      TeamRole.OWNER,
      TeamRole.ADMIN,
    ]);
    expect(TEAM_PERMISSIONS[TeamAction.MANAGE_PARTICIPANTS]).toEqual([
      TeamRole.OWNER,
      TeamRole.ADMIN,
    ]);
    expect(roleCan(TeamRole.MEMBER, TeamAction.MANAGE_AGENDA)).toBe(false);
  });

  it('cualquier rol del equipo puede ver reuniones y notas', () => {
    expect(TEAM_PERMISSIONS[TeamAction.VIEW_MEETINGS]).toEqual(TEAM_ROLES);
    expect(TEAM_PERMISSIONS[TeamAction.VIEW_NOTES]).toEqual(TEAM_ROLES);
  });

  it('un invitado no puede crear reuniones ni tareas', () => {
    expect(roleCan(TeamRole.GUEST, TeamAction.CREATE_MEETING)).toBe(false);
    expect(roleCan(TeamRole.GUEST, TeamAction.CREATE_TASKS)).toBe(false);
  });

  it('un miembro sí puede crear reuniones y tareas', () => {
    expect(roleCan(TeamRole.MEMBER, TeamAction.CREATE_MEETING)).toBe(true);
    expect(roleCan(TeamRole.MEMBER, TeamAction.CREATE_TASKS)).toBe(true);
  });
});