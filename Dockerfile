# Multi-stage build for Hypastack (Next.js). Build loads the real .env (like the
# host build) so NEXT_PUBLIC_* get inlined and any build-time data access works;
# the .env is stripped before the runtime image so no secrets are baked in.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi
COPY . .
RUN npm run build
RUN rm -f .env .env.*

FROM node:24-bookworm-slim AS run
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build --chown=node:node /app /app
USER node
EXPOSE 3000
# .env is mounted read-only at runtime (see quadlet); next start loads it
CMD ["npm","run","start","--","-H","127.0.0.1"]
