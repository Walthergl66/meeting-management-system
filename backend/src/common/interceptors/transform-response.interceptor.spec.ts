import { CallHandler, ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';
import { TransformResponseInterceptor } from './transform-response.interceptor';

describe('TransformResponseInterceptor', () => {
  let interceptor: TransformResponseInterceptor<unknown>;
  let setHeader: jest.Mock;

  const context = (requestId?: string): ExecutionContext => {
    const response = {
      setHeader,
      req: {
        headers: requestId === undefined ? {} : { 'x-request-id': requestId },
      },
    };

    return {
      switchToHttp: () => ({ getResponse: () => response }),
    } as unknown as ExecutionContext;
  };

  const emits = (payload: unknown) => {
    const next: CallHandler<unknown> = { handle: () => of(payload) };
    return interceptor.intercept(context('req-1'), next);
  };

  beforeEach(() => {
    setHeader = jest.fn();
    interceptor = new TransformResponseInterceptor();
  });

  describe('envoltura de las respuestas', () => {
    it('envuelve un objeto suelto en data', (done) => {
      emits({ id: 'usr_1' }).subscribe((result) => {
        expect(result).toEqual({ data: { id: 'usr_1' } });
        done();
      });
    });

    it('envuelve un array suelto en data', (done) => {
      emits([{ id: 1 }]).subscribe((result) => {
        expect(result).toEqual({ data: [{ id: 1 }] });
        done();
      });
    });

    it('deja intacta una respuesta que ya trae data y meta', (done) => {
      const paginated = { data: [{ id: 1 }], meta: { total: 1 } };
      emits(paginated).subscribe((result) => {
        expect(result).toBe(paginated);
        done();
      });
    });

    it('deja intacta una respuesta que ya trae data y message', (done) => {
      const enveloped = { data: { id: 'usr_1' }, message: 'Perfil obtenido' };
      emits(enveloped).subscribe((result) => {
        expect(result).toBe(enveloped);
        done();
      });
    });

    it('no vuelve a envolver un objeto que solo tiene una propiedad data', (done) => {
      // Un recurso legítimo puede llamarse data; con message o meta se
      // distingue de una respuesta ya envuelta.
      const recurso = { data: 'valor' };
      emits(recurso).subscribe((result) => {
        expect(result).toEqual({ data: recurso });
        done();
      });
    });

    it('normaliza null y undefined a data null', (done) => {
      emits(null).subscribe((primero) => {
        expect(primero).toEqual({ data: null });
        emits(undefined).subscribe((segundo) => {
          expect(segundo).toEqual({ data: null });
          done();
        });
      });
    });

    it('no altera los valores primitivos dentro de data', (done) => {
      emits('texto plano').subscribe((result) => {
        expect(result).toEqual({ data: 'texto plano' });
        done();
      });
    });
  });

  describe('X-Request-Id', () => {
    it('reenvía el identificador de petición como cabecera', (done) => {
      emits({ id: 1 }).subscribe(() => {
        expect(setHeader).toHaveBeenCalledWith('X-Request-Id', 'req-1');
        done();
      });
    });

    it('no falla cuando la petición no trae ese identificador', (done) => {
      interceptor
        .intercept(context(), { handle: () => of({ id: 1 }) })
        .subscribe((result) => {
          expect(result).toEqual({ data: { id: 1 } });
          expect(setHeader).toHaveBeenCalledWith('X-Request-Id', undefined);
          done();
        });
    });

    it('no falla cuando la respuesta no expone req', (done) => {
      const contextSinReq = {
        switchToHttp: () => ({ getResponse: () => ({ setHeader }) }),
      } as unknown as ExecutionContext;

      interceptor
        .intercept(contextSinReq, { handle: () => of({ id: 1 }) })
        .subscribe((result) => {
          expect(result).toEqual({ data: { id: 1 } });
          done();
        });
    });
  });
});
