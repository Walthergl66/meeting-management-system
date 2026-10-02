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
COPY backend backend
RUN pnpm exec prisma generate && pnpm run build

FROM base AS runner
ENV NODE_ENV=production
COPY --from=prod-deps /repo /repo
COPY --from=build /repo/backend/node_modules/.prisma /repo/backend/node_modules/.prisma
COPY --from=build /repo/backend/node_modules/@prisma/client /repo/backend/node_modules/@prisma/client
COPY --from=build /repo/backend/dist /repo/backend/dist
COPY --from=build /repo/backend/prisma /repo/backend/prisma
WORKDIR /repo/backend
EXPOSE 3000
CMD ["node", "dist/main"]
