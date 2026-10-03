import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    reporters: ['default'],
  },
  resolve: {
    // Los módulos del proyecto importan con el alias "@/lib/...", el mismo
    // que usa tsconfig.json. Sin replicarlo aquí, los tests no resuelven.
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});