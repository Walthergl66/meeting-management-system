import { Test, TestingModule } from '@nestjs/testing';
import {
  DecisionCreatedEvent,
  DecisionUpdatedEvent,
  NoteCreatedEvent,
  NoteUpdatedEvent,
} from '../../common/events/domain-events';
import { MentionsListener } from './mentions.listener';
import { MentionsService } from './mentions.service';

describe('MentionsListener', () => {
  let listener: MentionsListener;
  let mentions: {
    newMentions: jest.Mock;
    notifyEmails: jest.Mock;
  };

  const flush = () => new Promise(process.nextTick);

  beforeEach(async () => {
    mentions = {
      newMentions: jest.fn().mockReturnValue(['ana@correo.com']),
      notifyEmails: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MentionsListener,
        { provide: MentionsService, useValue: mentions },
      ],
    }).compile();

    listener = module.get(MentionsListener);
  });

  it('avisa a los citados al crear una nota', async () => {
    listener.onNoteCreated(
      new NoteCreatedEvent('note_1', 'mtg_1', 'team_1', 'usr_1', 'hola'),
    );
    await flush();

    expect(mentions.notifyEmails).toHaveBeenCalledWith(
      'team_1',
      'usr_1',
      ['ana@correo.com'],
      'NOTE',
      'note_1',
    );
  });

  it('avisa solo de las menciones nuevas al editar una nota', async () => {
    listener.onNoteUpdated(
      new NoteUpdatedEvent(
        'note_1',
        'mtg_1',
        'team_1',
        'usr_1',
        'ahora @luis@correo.com',
        'antes @ana@correo.com',
      ),
    );
    await flush();

    expect(mentions.newMentions).toHaveBeenCalledWith(
      'ahora @luis@correo.com',
      'antes @ana@correo.com',
    );
  });

  it('no notifica cuando la edición no añade menciones', async () => {
    mentions.newMentions.mockReturnValue([]);

    listener.onNoteUpdated(
      new NoteUpdatedEvent(
        'note_1',
        'mtg_1',
        'team_1',
        'usr_1',
        'sin cambios',
        'sin cambios',
      ),
    );
    await flush();

    expect(mentions.notifyEmails).not.toHaveBeenCalled();
  });

  it('avisa a los citados al crear una decisión', async () => {
    listener.onDecisionCreated(
      new DecisionCreatedEvent(
        'dec_1',
        'mtg_1',
        'team_1',
        'usr_1',
        'Presupuesto',
        'Presupuesto @ana@correo.com',
      ),
    );
    await flush();

    expect(mentions.notifyEmails).toHaveBeenCalledWith(
      'team_1',
      'usr_1',
      ['ana@correo.com'],
      'DECISION',
      'dec_1',
    );
  });

  it('compara el texto anterior y el nuevo de una decisión editada', async () => {
    listener.onDecisionUpdated(
      new DecisionUpdatedEvent(
        'dec_1',
        'mtg_1',
        'team_1',
        'usr_1',
        'Presupuesto @luis@correo.com',
        'Presupuesto @ana@correo.com',
      ),
    );
    await flush();

    expect(mentions.newMentions).toHaveBeenCalledWith(
      'Presupuesto @luis@correo.com',
      'Presupuesto @ana@correo.com',
    );
  });

  it('registra el fallo sin propagarlo a la operación que lo originó', async () => {
    mentions.notifyEmails.mockRejectedValue(new Error('db caída'));

    expect(() =>
      listener.onNoteCreated(
        new NoteCreatedEvent('note_1', 'mtg_1', 'team_1', 'usr_1', 'hola'),
      ),
    ).not.toThrow();

    await flush();
  });
});
