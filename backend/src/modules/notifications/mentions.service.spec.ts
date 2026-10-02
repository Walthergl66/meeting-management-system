import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '../../shared';
import { PrismaService } from '../../prisma/prisma.service';
import { MentionsService } from './mentions.service';
import { NotificationsService } from './notifications.service';

describe('MentionsService', () => {
  let service: MentionsService;
  let notifications: { createFor: jest.Mock };
  let prisma: {
    teamMember: { findMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      teamMember: { findMany: jest.fn() },
    };
    notifications = { createFor: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get(MentionsService);
  });

  describe('extractEmails', () => {
    it('extrae menciones por email', () => {
      const result = service.extractEmails(
        'Revisa @ana@correo.com y @luis@correo.com por favor',
      );

      expect(result).toEqual(['ana@correo.com', 'luis@correo.com']);
    });

    it('normaliza a minúsculas y elimina duplicados', () => {
      const result = service.extractEmails('@Ana@Correo.com y @ana@correo.com');

      expect(result).toEqual(['ana@correo.com']);
    });

    it('ignora textos sin menciones', () => {
      expect(service.extractEmails('sin menciones aquí')).toEqual([]);
    });

    it('no confunde texto normal con un email', () => {
      expect(service.extractEmails('escribe a ana@correo.com')).toEqual([]);
    });
  });

  describe('notifyMentions', () => {
    it('no consulta la base si no hay menciones', async () => {
      await service.notifyMentions('team_1', 'usr_1', 'nada', 'NOTE', 'note_1');

      expect(prisma.teamMember.findMany).not.toHaveBeenCalled();
      expect(notifications.createFor).not.toHaveBeenCalled();
    });

    it('notifica a los miembros citados sin incluir al autor', async () => {
      prisma.teamMember.findMany.mockResolvedValue([{ userId: 'usr_2' }]);

      await service.notifyMentions(
        'team_1',
        'usr_1',
        'hola @ana@correo.com',
        'NOTE',
        'note_1',
      );

      expect(prisma.teamMember.findMany.mock.calls[0][0].where.userId).toEqual({
        not: 'usr_1',
      });
      expect(notifications.createFor).toHaveBeenCalledWith(['usr_2'], {
        type: NotificationType.MENTION,
        title: 'Te mencionaron',
        body: 'Te mencionaron en una nota.',
        metadata: { noteId: 'note_1' },
      });
    });

    it('usa decisionId en el metadata para decisiones', async () => {
      prisma.teamMember.findMany.mockResolvedValue([{ userId: 'usr_2' }]);

      await service.notifyMentions(
        'team_1',
        'usr_1',
        '@ana@correo.com Decide esto',
        'DECISION',
        'dec_1',
      );

      expect(notifications.createFor).toHaveBeenCalledWith(
        ['usr_2'],
        expect.objectContaining({ metadata: { decisionId: 'dec_1' } }),
      );
    });

    it('no crea nada si las menciones no corresponden a miembros', async () => {
      prisma.teamMember.findMany.mockResolvedValue([]);

      await service.notifyMentions(
        'team_1',
        'usr_1',
        '@externo@otro.com',
        'NOTE',
        'note_1',
      );

      expect(notifications.createFor).not.toHaveBeenCalled();
    });
  });
});
