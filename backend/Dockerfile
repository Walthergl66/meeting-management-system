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
# El cliente generado vive en /opt/prisma-client, no en la ruta versionada del
# store de pnpm. @prisma/client lo resuelve como specifier ("bare") hacia
# arriba, así que le basta con que node_modules/@prisma/client y
# node_modules/.prisma existan.
COPY --from=build /opt/prisma-client/.prisma /repo/backend/node_modules/.prisma
COPY --from=build /opt/prisma-client/client /repo/backend/node_modules/@prisma/client
COPY --from=build /repo/backend/dist /repo/backend/dist
COPY --from=build /repo/backend/prisma /repo/backend/prisma
WORKDIR /repo/backend
# El proceso no corre como root. /app/uploads se crea aquí con ownership de
# node para que el volumen con nombre que lo monta (api-uploads) lo herede al
# inicializarse: si el directorio no existiera en la imagen, el volumen nace
# root-owned y la API no podría escribir adjuntos.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3000
CMD ["node", "dist/src/main"]
