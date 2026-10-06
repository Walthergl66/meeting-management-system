# syntax=docker/dockerfile:1

FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable

# El frontend es un proyecto pnpm independiente: su lockfile vive aqui.
WORKDIR /repo/frontend

FROM base AS deps
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# El runner no debe heredar las devDependencies (typescript, eslint, vitest,
# tailwind, autoprefixer, @types/*). El backend ya lo hace con una etapa
# prod-deps; aquí faltaba, así que la imagen de producción arrastraba el árbol
# de desarrollo completo y casi el doble de superficie de ataque.
FROM base AS prod-deps
COPY frontend/package.json frontend/pnpm-lock.yaml ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

FROM deps AS build
# Next incrusta las NEXT_PUBLIC_* en el bundle durante el build, no al arrancar.
# Sin este ARG, el compose tendría que pasar la URL por entorno y llegaría
# demasiado tarde.
ARG NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
COPY frontend ./
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
# Sin workspace, Next usa el proyecto como raiz: server.js queda en la raiz
# del standalone y los assets en .next/static.
COPY --from=prod-deps /repo /app
COPY --from=build /repo/frontend/.next/standalone ./
COPY --from=build /repo/frontend/.next/static ./.next/static
# public/ (manifest, service worker e iconos de la FASE 14) no forma parte del
# standalone: hay que copiarlo aparte o el navegador recibiría 404.
COPY --from=build /repo/frontend/public ./public

# Next escribe su caché de imágenes en .next/cache: sin escritura el arranque
# falla en cuanto una ruta usa el optimizador.
RUN mkdir -p /app/.next/cache && chown -R node:node /app/.next
USER node

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
