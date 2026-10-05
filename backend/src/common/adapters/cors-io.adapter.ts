import { INestApplicationContext } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { IoAdapter } from '@nestjs/platform-socket.io';

type CreateOptions = NonNullable<Parameters<IoAdapter['create']>[1]>;

/**
 * Adaptador de WebSocket con el origen resuelto en runtime. El decorador
 * `@WebSocketGateway` se evalua al importar el modulo, antes de que
 * ConfigModule lea el .env, asi que es el unico sitio donde el origen puede
 * depender de la configuracion de verdad.
 */
export class CorsIoAdapter extends IoAdapter {
  constructor(
    app: INestApplicationContext,
    private readonly corsOptions: CorsOptions,
  ) {
    super(app);
  }

  create(
    port: number,
    options?: CreateOptions,
  ): ReturnType<IoAdapter['create']> {
    return super.create(port, { ...options, cors: this.corsOptions });
  }
}
