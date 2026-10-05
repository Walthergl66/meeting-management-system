import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs-extra';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { StorageConfig } from '../../config/configuration';
import {
  IStorageService,
  StorageUploadResult,
} from '../interfaces/storage.interface';

@Injectable()
export class LocalStorageService implements IStorageService, OnModuleInit {
  private readonly logger = new Logger(LocalStorageService.name);
  private basePath: string;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const storage = this.configService.get<StorageConfig>('storage');
    this.basePath = storage.localPath;
    if (this.basePath.startsWith('./')) {
      this.basePath = join(process.cwd(), this.basePath);
    }
    fs.ensureDirSync(this.basePath);
    this.logger.log(`Almacenamiento local inicializado en: ${this.basePath}`);
  }

  async upload(params: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  }): Promise<StorageUploadResult> {
    const extension = this.getExtension(params.originalName);
    const filename = `${randomUUID()}${extension}`;
    const key = filename;
    const filePath = join(this.basePath, filename);

    await fs.writeFile(filePath, params.buffer);
    return {
      key,
      url: null,
      filename,
      mimeType: params.mimeType,
      sizeBytes: params.buffer.length,
    };
  }

  async delete(key: string): Promise<void> {
    await fs.remove(join(this.basePath, key)).catch(() => undefined);
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getUrl(_key: string): string | null {
    // El almacenamiento local no sirve los archivos por URL: el controlador de
    // adjuntos expone los metadatos y el contenido se sirve por otro camino.
    return null;
  }

  /**
   * La extensión se saeca del nombre que envía el cliente, así que se acota a
   * un patrón corto y sin separadores. Antes se concatenaba tal cual: un
   * nombre como "informe./../../x" producía una ruta con subdirectorios
   * inexistentes y el guardado fallaba con un 500.
   */
  private getExtension(originalName: string): string {
    const match = /\.([A-Za-z0-9]{1,10})$/.exec(originalName);

    return match ? `.${match[1].toLowerCase()}` : '';
  }
}
