import { ConfigService } from '@nestjs/config';
import { mkdtempSync, readdirSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { LocalStorageService } from './local-storage.service';

describe('LocalStorageService', () => {
  let basePath: string;
  let service: LocalStorageService;

  const subir = (originalName: string, content = 'contenido') =>
    service.upload({
      buffer: Buffer.from(content),
      originalName,
      mimeType: 'text/plain',
    });

  beforeEach(() => {
    basePath = mkdtempSync(join(tmpdir(), 'meetflow-storage-'));

    const module = {
      get: jest.fn((key: string) =>
        key === 'storage' ? { localPath: basePath } : undefined,
      ),
    };

    service = new LocalStorageService(module as unknown as ConfigService);
    service.onModuleInit();
  });

  afterEach(() => {
    rmSync(basePath, { recursive: true, force: true });
  });

  it('guarda el archivo con un nombre propio y conserva la extensión', async () => {
    const resultado = await subir('notas.txt');

    expect(resultado.filename).toMatch(/^[0-9a-f-]{36}\.txt$/);
    expect(readdirSync(basePath)).toEqual([resultado.filename]);
  });

  it('normaliza la extensión a minúsculas', async () => {
    const resultado = await subir('INFORME.PDF');

    expect(resultado.filename.endsWith('.pdf')).toBe(true);
  });

  it('no deja que el nombre del cliente meta separadores en la ruta', async () => {
    // Antes la extensión se concatenaba tal cual y el nombre podía producir una
    // ruta con subdirectorios inexistentes, con un 500 al guardar.
    const resultado = await subir('informe./../../etc/evasion.txt');

    expect(resultado.filename).not.toContain('/');
    expect(resultado.filename).not.toContain('..');
    expect(readdirSync(basePath)).toEqual([resultado.filename]);
  });

  it('descarta una extensión con caracteres no permitidos', async () => {
    const resultado = await subir('hoja.xlsx<script>');

    expect(resultado.filename).not.toContain('<');
    expect(resultado.filename).not.toContain('>');
  });

  it('no inventa extensión cuando el nombre no trae ninguna', async () => {
    const resultado = await subir('sin-extension');

    expect(resultado.filename).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('no expone una URL pública en el almacenamiento local', () => {
    expect(service.getUrl('cualquier-clave')).toBeNull();
  });

  it('borra el archivo y tolera que ya no exista', async () => {
    const resultado = await subir('borrar.txt');

    await service.delete(resultado.key);
    expect(readdirSync(basePath)).toEqual([]);

    // Segundo borrado: no debe romper nada.
    await expect(service.delete(resultado.key)).resolves.toBeUndefined();
  });
});
