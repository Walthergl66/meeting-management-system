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

FROM deps AS build
COPY frontend frontend
RUN pnpm run build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app
# Sin workspace, Next usa el proyecto como raiz: server.js queda en la raiz
# del standalone y los assets en .next/static.
COPY --from=deps /repo /app
COPY --from=build /repo/frontend/.next/standalone ./
COPY --from=build /repo/frontend/.next/static ./.next/static

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]
