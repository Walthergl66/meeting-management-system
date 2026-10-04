import { Injectable, Logger } from '@nestjs/common';
import {
  IAssistantService,
  AssistantSuggestion,
} from '../interfaces/assistant.interface';

@Injectable()
export class FakeAssistantService implements IAssistantService {
  private readonly logger = new Logger(FakeAssistantService.name);

  async summarizeMeeting(meetingId: string): Promise<AssistantSuggestion> {
    this.logger.debug(`Generando resumen falso para reunión ${meetingId}`);
    return {
      content: 'Resumen generado en modo pruebas (sin IA real).',
      confidence: 0.5,
    };
  }

  async suggestAgenda(
    title: string,
    description?: string,
  ): Promise<AssistantSuggestion[]> {
    const contexto = description ? `${title}: ${description}` : title;
    this.logger.debug(
      `Generando sugerencias de agenda falsas para ${contexto}`,
    );
    return [
      {
        content: 'Introducción y objetivos',
        confidence: 0.6,
      },
      {
        content: 'Puntos a tratar',
        confidence: 0.6,
      },
      {
        content: 'Acciones y cierre',
        confidence: 0.6,
      },
    ];
  }

  async summarizeTasks(teamId: string): Promise<AssistantSuggestion> {
    this.logger.debug(
      `Generando resumen de tareas falso para equipo ${teamId}`,
    );
    return {
      content: 'Resumen de tareas en modo de pruebas.',
      confidence: 0.5,
    };
  }
}
