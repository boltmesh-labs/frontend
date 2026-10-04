# syntax=docker/dockerfile:1

# ---------- base: shared toolchain ----------
# Pinned major tag (never a bare floating tag like `alpine`) so image pulls are
# reproducible across machines while still receiving patch updates.
# 24 is the Active LTS line ("Krypton"). The odd-numbered lines are Current
# releases with no LTS backing, so they are skipped deliberately.
FROM docker.io/library/node:24-alpine AS base
WORKDIR /app

# ---------- deps: install exactly what package-lock.json pins ----------
# `npm ci`, never `npm install`: the committed lockfile is the source of truth,
# guaranteeing identical trees in dev, CI, and prod images.
FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---------- dev: Vite dev server (what docker-compose runs) ----------
# Source and node_modules are volume-mounted by compose; the baked-in copy
# merely seeds the named volume on first run. Runs as the unprivileged `node`
# user; --chown keeps the seeded volume writable by that user.
FROM base AS dev
ENV NODE_ENV=development
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node . .
EXPOSE 5173
USER node
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

# ---------- build: compile the production bundle ----------
FROM base AS build
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# VITE_* build arguments must also be environment variables for Vite to inline
# them into the production bundle at build time.
ARG VITE_API_URL
ARG VITE_APP_COMPANY_NAME
ARG VITE_APP_SUPPORT_EMAIL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_COMPANY_NAME=$VITE_APP_COMPANY_NAME
ENV VITE_APP_SUPPORT_EMAIL=$VITE_APP_SUPPORT_EMAIL
RUN npm run build

# ---------- prod (default): nginx serves the static bundle ----------
# The SPA calls the API directly via VITE_API_URL, so no API proxy is needed
# here; point CORS at wherever this image is hosted.
#
# Pinned to the nginx stable line (even majors), same rationale as the node
# base above. 1.29 was a mainline release and is now superseded upstream: the
# tag still pulls, but no further patches are published for it, so it would sit
# frozen with no security updates. Stable is 1.30; 1.31 is mainline.
FROM docker.io/library/nginx:1.31-alpine AS prod
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
