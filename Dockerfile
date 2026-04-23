FROM node:20-bookworm-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NODE_OPTIONS="--max-old-space-size=8192"

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json .npmrc ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
COPY tools ./tools
COPY postcss.config.js tailwind.config.js ./

RUN pnpm install --frozen-lockfile
RUN node scripts/update-version.js \
    && pnpm exec tsc -p apps/web/tsconfig.app.json --noEmit \
    && pnpm exec vite build --config apps/web/vite.config.ts \
    && pnpm exec vite build --config apps/web/vite.sw.config.ts

FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist/apps/web /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]