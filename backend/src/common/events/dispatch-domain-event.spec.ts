import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { dispatchDomainEvent } from './dispatch-domain-event';

describe('dispatchDomainEvent', () => {
  let emitter: EventEmitter2;
  let logger: Logger;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    emitter = new EventEmitter2();
    logger = new Logger('TestContext');
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('espera a que el listener async termine antes de resolver', async () => {
    const orden: string[] = [];

    emitter.on('demo', async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
      orden.push('listener');
    });

    await dispatchDomainEvent(emitter, logger, 'demo', { id: 1 });

    orden.push('despues');
    expect(orden).toEqual(['listener', 'despues']);
  });

  it('propaga el evento al listener con su payload', async () => {
    const recibido = jest.fn();
    emitter.on('demo', recibido);

    await dispatchDomainEvent(emitter, logger, 'demo', { id: 'x' });

    expect(recibido).toHaveBeenCalledWith({ id: 'x' });
  });

  it('registra el fallo pero no lo propaga, para no tumbar la operacion', async () => {
    emitter.on('demo', async () => {
      throw new Error('la base de datos no responde');
    });

    await expect(
      dispatchDomainEvent(emitter, logger, 'demo', { id: 1 }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy.mock.calls[0][0]).toContain('demo');
  });

  it('no registra nada cuando el listener resuelve bien', async () => {
    emitter.on('demo', async () => undefined);

    await dispatchDomainEvent(emitter, logger, 'demo', { id: 1 });

    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('no falla aunque ningun listener este registrado', async () => {
    await expect(
      dispatchDomainEvent(emitter, logger, 'sin-listener', { id: 1 }),
    ).resolves.toBeUndefined();
  });

  it('atrapa tambien rechazos que no son instancias de Error', async () => {
    emitter.on('demo', async () => {
      throw 'fallo en texto plano';
    });

    await expect(
      dispatchDomainEvent(emitter, logger, 'demo', { id: 1 }),
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledTimes(1);
  });
});
