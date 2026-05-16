FROM node:20-slim

WORKDIR /app

RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

COPY prisma ./prisma

RUN npm install

COPY . .

ENV NODE_ENV=production

RUN npx prisma generate

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
