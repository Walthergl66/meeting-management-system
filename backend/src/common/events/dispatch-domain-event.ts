import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Despacha un evento de dominio esperando a que terminen sus listeners.
 *
 * `EventEmitter2.emit()` es sincrono y no espera: con listeners `async` que
 * escriben en base de datos, la peticion HTTP respondia antes de que la
 * notificacion existiera. Eso deja dos fallos silenciosos:
 *
 * - Un cliente que crea un recurso y acto seguido lista sus notificaciones
 *   puede no verlas todavia.
 * - Si un listener lanza, la promesa rechazada no la observa nadie. Node 24
 *   termina el proceso ante un unhandled rejection, asi que un fallo al
 *   notificar tumbaria la API entera.
 *
 * Awaitar `emitAsync` cierra ambos: la escritura forma parte del ciclo de
 * vida de la peticion y el error se captura. El fallo se registra pero no
 * propaga, para conservar el comportamiento actual: la notificacion nunca
 * hizo fallar la operacion de negocio que la origino.
 */
export async function dispatchDomainEvent(
  emitter: EventEmitter2,
  logger: Logger,
  event: string,
  payload: unknown,
): Promise<void> {
  try {
    await emitter.emitAsync(event, payload);
  } catch (error) {
    logger.error(
      `[events] No se pudo despachar "${event}"`,
      error instanceof Error ? error.stack : String(error),
    );
  }
}
