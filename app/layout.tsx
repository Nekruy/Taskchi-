import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Navbar } from "@/components/Navbar";
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
  openGraph: {
    title: "Taskchi — Маркетплейс задач",
    description: "Hyperlocal маркетплейс задач для Таджикистана",
    locale: "ru_RU",
    type: "website",
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
          <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>

            {/* Footer */}
            <footer className="bg-gray-900 text-gray-400 mt-16">
              <div className="max-w-6xl mx-auto px-4 py-12">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                  <div className="col-span-2 md:col-span-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">🎯</span>
                      <span className="text-white font-bold text-xl">Taskchi</span>
                    </div>
                    <p className="text-sm leading-relaxed">
                      Любая задача — за минуты. От похода в магазин до IT проекта. С защитой оплаты.
                    </p>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-3 text-sm">Платформа</h4>
                    <ul className="space-y-2 text-sm">
                      <li><Link href="/tasks" className="hover:text-white transition-colors">Все задачи</Link></li>
                      <li><Link href="/tasks/create" className="hover:text-white transition-colors">Создать задачу</Link></li>
                      <li><Link href="/map" className="hover:text-white transition-colors">Карта задач</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-3 text-sm">Категории</h4>
                    <ul className="space-y-2 text-sm">
                      <li><Link href="/tasks?category=DELIVERY" className="hover:text-white transition-colors">Доставка</Link></li>
                      <li><Link href="/tasks?category=SHOPPING" className="hover:text-white transition-colors">Покупки</Link></li>
                      <li><Link href="/tasks?category=HOUSEHOLD" className="hover:text-white transition-colors">Домашние дела</Link></li>
                      <li><Link href="/tasks?category=ONLINE" className="hover:text-white transition-colors">Онлайн-задачи</Link></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-white font-semibold mb-3 text-sm">Аккаунт</h4>
                    <ul className="space-y-2 text-sm">
                      <li><Link href="/login" className="hover:text-white transition-colors">Войти</Link></li>
                      <li><Link href="/register" className="hover:text-white transition-colors">Регистрация</Link></li>
                      <li><Link href="/dashboard" className="hover:text-white transition-colors">Дашборд</Link></li>
                    </ul>
                  </div>
                </div>
                <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs">
                  <p>© 2024 Taskchi. Все права защищены.</p>
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
