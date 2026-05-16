FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

COPY prisma ./prisma

RUN npm install

COPY . .

ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://dummy:dummy@localhost:5432/dummy?schema=public
ENV NEXTAUTH_SECRET=dummy-build-secret-not-used-at-runtime
ENV NEXTAUTH_URL=http://localhost:3000
ENV SKIP_ENV_VALIDATION=1

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
