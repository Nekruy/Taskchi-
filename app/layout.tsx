import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
import { NavigationProgress } from "@/components/NavigationProgress";
import Link from "next/link";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: {
    default: "Taskchi — Любая задача за минуты в Таджикистане",
    template: "%s | Taskchi",
  },
  description:
    "Taskchi — найдите исполнителей для любых задач: доставка, покупки, уборка, очереди и многое другое. Быстро, безопасно, с эскроу-защитой.",
  keywords: ["Таджикистан", "задачи", "фриланс", "Душанбе", "помощь", "доставка"],
  icons: {
    icon: [
      { url: "/logo-icon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/logo-icon.svg",
    apple:    "/logo-icon.svg",
  },
  openGraph: {
    title:       "Taskchi — Маркетплейс задач",
    description: "Hyperlocal маркетплейс задач для Таджикистана",
    locale:      "ru_RU",
    type:        "website",
    images: [
      {
        url:    "/logo.svg",
        width:  210,
        height: 60,
        alt:    "Taskchi — Маркетплейс услуг",
      },
    ],
  },
  twitter: {
    card:        "summary",
    title:       "Taskchi — Маркетплейс задач",
    description: "Любая задача за минуты в Таджикистане",
    images:      ["/logo.svg"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 text-gray-900`}>
        <Providers>
          <NavigationProgress />
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>

            {/* ── Footer ── */}
            <footer style={{ background: "#0a1a0a" }} className="mt-16">
              <div className="max-w-6xl mx-auto px-4 pt-14 pb-8">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">

                  {/* Brand column */}
                  <div className="col-span-2 md:col-span-1">
                    <div className="mb-4">
                      <img src="/logo-dark.svg" alt="Taskchi" style={{ height: 36, width: "auto" }} />
                    </div>
                    <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,.45)" }}>
                      Любая задача — за минуты.<br />
                      От похода в магазин до IT проекта.<br />
                      С эскроу-защитой оплаты.
                    </p>
                    <div className="flex gap-3 mt-4">
                      <a
                        href="https://t.me/taskchi"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="footer-social"
                        title="Telegram"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                        </svg>
                      </a>
                    </div>
                  </div>

                  {/* Platform links */}
                  <div>
                    <h4 className="font-semibold mb-4 text-sm" style={{ color: "rgba(255,255,255,.85)" }}>Платформа</h4>
                    <ul className="space-y-2.5 text-sm">
                      <li><Link href="/tasks"        className="footer-link">Все задачи</Link></li>
                      <li><Link href="/tasks/create" className="footer-link">Создать задачу</Link></li>
                      <li><Link href="/map"          className="footer-link">Карта задач</Link></li>
                    </ul>
                  </div>

                  {/* Category links */}
                  <div>
                    <h4 className="font-semibold mb-4 text-sm" style={{ color: "rgba(255,255,255,.85)" }}>Категории</h4>
                    <ul className="space-y-2.5 text-sm">
                      <li><Link href="/tasks?category=DELIVERY"  className="footer-link">Доставка</Link></li>
                      <li><Link href="/tasks?category=SHOPPING"  className="footer-link">Покупки</Link></li>
                      <li><Link href="/tasks?category=HOUSEHOLD" className="footer-link">Домашние дела</Link></li>
                      <li><Link href="/tasks?category=ONLINE"    className="footer-link">Онлайн-задачи</Link></li>
                      <li><Link href="/tasks?category=QUEUE"     className="footer-link">Очереди</Link></li>
                    </ul>
                  </div>

                  {/* Account links */}
                  <div>
                    <h4 className="font-semibold mb-4 text-sm" style={{ color: "rgba(255,255,255,.85)" }}>Аккаунт</h4>
                    <ul className="space-y-2.5 text-sm">
                      <li><Link href="/login"    className="footer-link">Войти</Link></li>
                      <li><Link href="/register" className="footer-link">Регистрация</Link></li>
                      <li><Link href="/customer" className="footer-link">Кабинет</Link></li>
                    </ul>
                  </div>
                </div>

                {/* Bottom bar */}
                <div
                  className="pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs"
                  style={{ borderTop: "1px solid rgba(255,255,255,.08)", color: "rgba(255,255,255,.30)" }}
                >
                  <p>© 2025 Taskchi. Все права защищены.</p>
                  <p>Тоҷикистон · Душанбе · taskchi.tj</p>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
