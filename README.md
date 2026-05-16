# 🎯 Taskchi — Hyperlocal Task Marketplace for Tajikistan

Taskchi — маркетплейс задач для Таджикистана с AI-помощником, эскроу-защитой и чатом в реальном времени.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL + Prisma ORM |
| Auth | NextAuth.js (Email/Password) |
| Real-time | Socket.io |
| AI | Groq API (llama-3.3-70b-versatile) |
| Notifications | Telegram Bot |
| PDF | PDFKit |
| Maps | Leaflet.js + OpenStreetMap |
| Deploy | Railway |

## Features

- **AI Task Creation** — describe task in free text, AI parses title/category/budget
- **Escrow Protection** — funds held until task completion: `min(budget × 5%, 100 TJS)`
- **Real-time Chat** — Socket.io powered chat between customer and executor
- **AI Contract Generation** — Groq generates legal PDF contracts
- **Telegram Notifications** — new tasks, offers, messages
- **Interactive Map** — Leaflet map with task pins
- **Group Tasks** — tasks for multiple executors
- **Rating System** — reviews after task completion

## Task Categories

| Key | Russian | Tajik |
|-----|---------|-------|
| CHILDREN | Дети | Кӯдакон |
| SHOPPING | Покупки | Харидорӣ |
| DELIVERY | Доставка | Расонидан |
| QUEUE | Очередь | Навбат |
| HOUSEHOLD | Домашние дела | Корҳои хонагӣ |
| ONLINE | Онлайн | Интернет |

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/yourname/taskchi.git
cd taskchi
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 3. Setup database
npx prisma migrate dev --name init
npm run prisma:seed

# 4. Start development server
npm run dev
```

## Environment Variables

See `.env.example` for all required variables:

- `DATABASE_URL` — PostgreSQL connection string
- `NEXTAUTH_SECRET` — Random 32+ char secret
- `GROQ_API_KEY` — From [console.groq.com](https://console.groq.com)
- `TELEGRAM_BOT_TOKEN` — From [@BotFather](https://t.me/BotFather)

## Deploy to Railway

1. Connect GitHub repo to Railway
2. Add PostgreSQL database service
3. Set environment variables
4. Railway auto-deploys on push

```bash
# Railway CLI deploy
railway up
```

## Commission Structure

```
commission = min(budget × 5%, 100 сомони)
executor_receives = budget - commission
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Register user |
| GET | `/api/tasks` | List tasks |
| POST | `/api/tasks` | Create task (+ AI mode) |
| GET | `/api/tasks/[id]` | Task details |
| POST | `/api/offers` | Submit offer |
| POST | `/api/offers/[id]/accept` | Accept offer |
| POST | `/api/contracts` | Generate PDF contract |
| POST | `/api/escrow/release` | Release payment |
| POST | `/api/escrow/refund` | Refund payment |
| GET | `/api/chat/[id]/messages` | Get messages |
| POST | `/api/chat/[id]/messages` | Send message |
| POST | `/api/reviews` | Leave review |
| GET | `/api/health` | Health check |

## Project Structure

```
taskchi/
├── app/
│   ├── api/          # API routes
│   ├── chat/         # Chat pages
│   ├── dashboard/    # User dashboard
│   ├── map/          # Task map
│   ├── profile/      # User profiles
│   ├── tasks/        # Task pages
│   ├── login/        # Auth pages
│   └── register/
├── components/       # Shared UI
├── lib/
│   ├── groq.ts       # AI integration
│   ├── telegram.ts   # Telegram bot
│   ├── prisma.ts     # DB client
│   ├── auth.ts       # NextAuth config
│   ├── commission.ts # Fee calculation
│   └── pdf.ts        # PDF generation
├── prisma/
│   └── schema.prisma # Database models
└── server.ts         # Custom server with Socket.io
```

---

Built with ❤️ for Tajikistan 🇹🇯
