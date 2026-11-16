# Portabox CRM: one image for staging and production (config comes from env vars).
FROM node:22-slim
WORKDIR /app

# Install exactly the versions recorded in bun.lock, so a new library release
# can't change or break a deploy. --frozen-lockfile fails the build if
# package.json and bun.lock disagree: run `bun install` and commit bun.lock.
COPY --from=oven/bun:1.4.4-slim /usr/local/bin/bun /usr/local/bin/bun
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
# Builds the site into dist/ and the server into build/server.mjs (outside dist/,
# so the server code is never served as a static file).
RUN npm run build

ENV NODE_ENV=production
# Cloud Run sets PORT (8080 by default); server.ts listens on it.
EXPOSE 8080
# Plain node on the bundled server: no TypeScript compile at startup.
CMD ["node", "--enable-source-maps", "build/server.mjs"]
