// Запускает Prisma CLI через DIRECT_URL (session-пулер Supabase, порт 5432).
// Schema engine (db push / migrate diff) не работает через transaction-пулер
// 6543 (pgbouncer) — зависает; Prisma Client в рантайме через 6543 работает.
// Использование: dotenv -e .env.local -- node scripts/prisma-direct.js db push
const { spawnSync } = require("child_process");
const path = require("path");

if (process.env.DIRECT_URL) process.env.DATABASE_URL = process.env.DIRECT_URL;

const host = (process.env.DATABASE_URL || "").replace(/\/\/[^@]*@/, "//***@");
console.log(`[prisma-direct] DATABASE_URL → ${host}`);

const prismaBin = path.join(path.dirname(require.resolve("prisma/package.json")), "build", "index.js");
const r = spawnSync(process.execPath, [prismaBin, ...process.argv.slice(2)], { stdio: "inherit", env: process.env });
process.exit(r.status ?? 1);
