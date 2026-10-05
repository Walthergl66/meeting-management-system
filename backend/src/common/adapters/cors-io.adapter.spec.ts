import { CorsIoAdapter } from './cors-io.adapter';

describe('CorsIoAdapter', () => {
  it('inyecta los orígenes resueltos en las opciones del servidor de socket.io', async () => {
    const adapter = new CorsIoAdapter(undefined, {
      origin: ['https://app.ejemplo.com'],
      credentials: true,
    });

    const server = adapter.create(0);

    try {
      expect(server.engine.opts.cors).toEqual({
        origin: ['https://app.ejemplo.com'],
        credentials: true,
      });
    } finally {
      await server.close();
    }
  });
});
