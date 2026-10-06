# syntax=docker/dockerfile:1

FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable

# El backend es un proyecto pnpm independiente: su lockfile vive aqui.
WORKDIR /repo/backend

FROM base AS deps
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM base AS prod-deps
COPY backend/package.json backend/pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

FROM deps AS build
COPY backend ./
# Tras generar el cliente se copia a /opt/prisma-client. La ruta real dentro
# del store de pnpm lleva las versiones exactas (node_modules/.pnpm/
# @prisma+client@6.19.3_prisma@6.19.3_typescript@5.9.3__typescript@5.9.3/...),
# y typescript está declarado como ^5.1.3: un bump resolvía a otra versión,
# cambiaba el sufijo de peer y el COPY de abajo fallaba con un "no such file or
# directory" críptico. El glob se resuelve en el build, donde un fallo es
# ruido de log, en vez de en el runner. Si algún día hubiera dos versiones de
# @prisma/client, cp fallaría en vez de copiar una por sorpresa.
RUN pnpm exec prisma generate \
  && pnpm run build \
  && mkdir -p /opt/prisma-client \
  && cp -r node_modules/.pnpm/@prisma+client*/node_modules/.prisma \
    /opt/prisma-client/.prisma \
  && cp -r node_modules/.pnpm/@prisma+client*/node_modules/@prisma/client \
    /opt/prisma-client/client

FROM base AS runner
ENV NODE_ENV=production
COPY --from=prod-deps /repo /repo
# El cliente generado se deja en un directorio neutro (/opt/prisma-client) y el
# RUN de abajo lo coloca exactamente donde Node lo resuelve. Con pnpm,
# node_modules/@prisma/client es un symlink al paquete del store versionado
# (.pnpm/@prisma+client@6.19.3_.../node_modules/@prisma/client), y el
# require('.prisma/client/default') del paquete se resuelve hacia arriba por
# node_modules hasta el DIRECTORIO HERMANO: .../node_modules/.prisma. Copiar a
# node_modules/.prisma y node_modules/@prisma/client de la raíz no servía: el
# código que se ejecutaba era el stub por defecto y Nest moría al arrancar con
# '@prisma/client did not initialize yet'. La ruta se resuelve en runtime con
# realpath en vez de hardcodear el sufijo versionado, porque cambia con cada
# bump de prisma o typescript.
COPY --from=build /opt/prisma-client /opt/prisma-client
COPY --from=build /repo/backend/dist /repo/backend/dist
COPY --from=build /repo/backend/prisma /repo/backend/prisma
WORKDIR /repo/backend
RUN <<'NODE'
node -e "
const fs = require('fs');
const path = require('path');
if (!fs.existsSync('/opt/prisma-client/.prisma/client/schema.prisma')) {
  throw new Error('/opt/prisma-client no contiene un cliente generado');
}
const pkgDir = fs.realpathSync(path.dirname(require.resolve('@prisma/client')));
const dest = path.join(pkgDir, '..', '..', '.prisma');
console.log('cliente generado -> ' + dest);
fs.rmSync(dest, { recursive: true, force: true });
fs.cpSync('/opt/prisma-client/.prisma', dest, { recursive: true });
if (!fs.existsSync(path.join(dest, 'client', 'schema.prisma'))) {
  throw new Error('el cliente no quedó en ' + dest);
}
"
NODE
# Cargar el cliente aquí mismo para que el build falle si la fuente siguiera
# siendo el stub, en vez de descubrirlo en el healthcheck del compose.
RUN node -e "const { Prisma } = require('@prisma/client'); if (!Prisma) process.exit(1); console.log('prisma client operativo');" \
  && rm -rf /opt/prisma-client
# El proceso no corre como root. /app/uploads se crea aquí con ownership de
# node para que el volumen con nombre que lo monta (api-uploads) lo herede al
# inicializarse: si el directorio no existiera en la imagen, el volumen nace
# root-owned y la API no podría escribir adjuntos.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3000
CMD ["node", "dist/src/main"]
