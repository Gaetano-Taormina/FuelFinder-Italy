# Backend Container - Express 5 & SQLite (100% Free Tier Optimized)
FROM node:22-alpine

WORKDIR /app

# Abilita pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copia file package e installa solo dipendenze di produzione
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --prod

# Copia il codice del server
COPY . .

ENV NODE_ENV=production
ENV PORT=3001
ENV HOST=0.0.0.0

EXPOSE 3001

CMD ["node", "server.js"]
