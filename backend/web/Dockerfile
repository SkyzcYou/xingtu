FROM node:20-bookworm-slim AS builder

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

ARG VITE_API_BASE_URL=https://api.xingtu.live
ARG VITE_FERRISKEY_BASE_URL=https://trust-api.skyzcstack.space
ARG VITE_FERRISKEY_REALM=xing
ARG VITE_FERRISKEY_CLIENT_ID=xingtu-console
ARG VITE_FERRISKEY_SCOPE="openid profile email offline_access"
ARG VITE_ADMIN_REQUIRED_ROLE=

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FERRISKEY_BASE_URL=$VITE_FERRISKEY_BASE_URL
ENV VITE_FERRISKEY_REALM=$VITE_FERRISKEY_REALM
ENV VITE_FERRISKEY_CLIENT_ID=$VITE_FERRISKEY_CLIENT_ID
ENV VITE_FERRISKEY_SCOPE=$VITE_FERRISKEY_SCOPE
ENV VITE_ADMIN_REQUIRED_ROLE=$VITE_ADMIN_REQUIRED_ROLE

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY backend/web/package.json ./backend/web/package.json
COPY packages/drawnix/package.json ./packages/drawnix/package.json
COPY packages/react-board/package.json ./packages/react-board/package.json
COPY packages/react-text/package.json ./packages/react-text/package.json
COPY packages/utils/package.json ./packages/utils/package.json

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store \
    pnpm config set registry https://registry.npmmirror.com/ \
    && pnpm install --frozen-lockfile

COPY backend/web ./backend/web
COPY packages ./packages

RUN pnpm exec vite build --config backend/web/vite.config.ts

FROM nginx:1.27-alpine AS runner

COPY backend/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist/backend/web /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
