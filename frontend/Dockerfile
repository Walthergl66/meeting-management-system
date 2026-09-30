# syntax=docker/dockerfile:1

FROM node:20-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
WORKDIR /repo

FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json .npmrc ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json
COPY packages/types/package.json packages/types/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/validation/package.json packages/validation/package.json
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY packages/types packages/types
COPY packages/config packages/config
COPY packages/validation packages/validation
COPY frontend frontend
RUN pnpm --filter @meetflow/types build \
  && pnpm --filter @meetflow/config build \
  && pnpm --filter @meetflow/validation build \
  && pnpm --filter @meetflow/frontend build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=deps /repo /repo
COPY --from=build /repo/packages/types/dist /repo/packages/types/dist
COPY --from=build /repo/packages/config/dist /repo/packages/config/dist
COPY --from=build /repo/packages/validation/dist /repo/packages/validation/dist
COPY --from=build /repo/frontend/.next/standalone ./
COPY --from=build /repo/frontend/.next/static ./frontend/.next/static

EXPOSE 3001
ENV PORT=3001
ENV HOSTNAME=0.0.0.0
CMD ["node", "frontend/server.js"]
