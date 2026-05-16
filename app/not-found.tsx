import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-8rem)] flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-8xl font-bold text-[#14A800] mb-4">404</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Страница не найдена</h1>
        <p className="text-slate-500 mb-8">Саҳифа ёфт нашуд</p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="btn-primary">На главную</Link>
          <Link href="/tasks" className="btn-secondary">Лента задач</Link>
        </div>
      </div>
    </div>
  );
}
