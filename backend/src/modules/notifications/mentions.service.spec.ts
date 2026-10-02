import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType } from '@meetflow/types';
import { PrismaService } from '../../prisma/prisma.service';
import { MentionsService } from './mentions.service';

describe('MentionsService', () => {
  let service: MentionsService;
  let prisma: {
    teamMember: { findMany: jest.Mock };
    notification: { createMany: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      teamMember: { findMany: jest.fn() },
      notification: { createMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentionsService,
        { provide: PrismaService, useValue: prisma },
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
      expect(prisma.notification.createMany).not.toHaveBeenCalled();
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
      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [
          {
            userId: 'usr_2',
            type: NotificationType.MENTION,
            title: 'Te mencionaron',
            body: 'Te mencionaron en una nota.',
            metadata: { noteId: 'note_1' },
          },
        ],
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

      expect(prisma.notification.createMany).toHaveBeenCalledWith({
        data: [expect.objectContaining({ metadata: { decisionId: 'dec_1' } })],
      });
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

      expect(prisma.notification.createMany).not.toHaveBeenCalled();
    });
  });
});
