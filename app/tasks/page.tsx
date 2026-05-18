import { prisma } from "@/lib/prisma";
import { TaskCard } from "@/components/TaskCard";
import Link from "next/link";
import { TaskFilters } from "./TaskFilters";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: {
    category?: string;
    city?: string;
    q?: string;
    page?: string;
    sort?: string;
    min?: string;
    max?: string;
    verified?: string;
  };
}

export default async function TasksPage({ searchParams }: PageProps) {
  const category = searchParams.category || "";
  const city = searchParams.city || "";
  const q = searchParams.q || "";
  const page = Math.max(1, parseInt(searchParams.page || "1"));
  const sort = searchParams.sort || "newest";
  const minBudget = parseInt(searchParams.min || "0") || 0;
  const maxBudget = parseInt(searchParams.max || "0") || 0;
  const verifiedOnly = searchParams.verified === "1";
  const limit = 12;
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status: "OPEN" };
  if (category) where.category = category;
  if (city) where.city = { contains: city, mode: "insensitive" };
  if (q) where.title = { contains: q, mode: "insensitive" };
  if (minBudget || maxBudget) {
    where.budget = {
      ...(minBudget ? { gte: minBudget } : {}),
      ...(maxBudget ? { lte: maxBudget } : {}),
    };
  }
  if (verifiedOnly) where.creator = { isVerified: true };

  const orderBy =
    sort === "budget_high" ? { budget: "desc" as const } :
    sort === "budget_low" ? { budget: "asc" as const } :
    { createdAt: "desc" as const };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        creator: { select: { id: true, name: true, avatar: true, rating: true, isVerified: true } },
        _count: { select: { offers: true } },
      },
      orderBy,
      skip,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  const pages = Math.ceil(total / limit);

  function buildUrl(overrides: Record<string, string>) {
    const base: Record<string, string> = {};
    if (category) base.category = category;
    if (city) base.city = city;
    if (q) base.q = q;
    if (sort !== "newest") base.sort = sort;
    if (minBudget) base.min = String(minBudget);
    if (maxBudget) base.max = String(maxBudget);
    if (verifiedOnly) base.verified = "1";
    const merged = { ...base, ...overrides };
    const p = new URLSearchParams();
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    const qs = p.toString();
    return `/tasks${qs ? `?${qs}` : ""}`;
  }

  const activeFiltersCount = [category, city, q, minBudget > 0, maxBudget > 0, sort !== "newest", verifiedOnly].filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {q ? `Поиск: «${q}»` : category ? `Задачи: ${category}` : "Все задачи"}
          </h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {total > 0 ? `Найдено ${total.toLocaleString("ru-RU")} задач` : "Задач не найдено"}
            {activeFiltersCount > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                {activeFiltersCount} фильтр{activeFiltersCount === 1 ? "" : activeFiltersCount < 5 ? "а" : "ов"}
              </span>
            )}
          </p>
        </div>
        <Link href="/tasks/create" className="btn-primary shrink-0">
          + Создать задачу
        </Link>
      </div>

      <div className="flex gap-6">
        {/* Sidebar filters */}
        <Suspense fallback={<div className="w-64 shrink-0 hidden lg:block" />}>
          <TaskFilters />
        </Suspense>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {tasks.length > 0 ? (
            <>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task as Parameters<typeof TaskCard>[0]["task"]}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  {page > 1 && (
                    <Link href={buildUrl({ page: String(page - 1) })} className="btn-secondary py-2 px-4 text-sm">
                      ← Назад
                    </Link>
                  )}

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                      const p = i + 1;
                      return (
                        <Link
                          key={p}
                          href={buildUrl({ page: String(p) })}
                          className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-medium transition-colors ${
                            page === p
                              ? "bg-[#14A800] text-white shadow-sm"
                              : "bg-white border border-gray-200 text-gray-600 hover:border-green-300 hover:text-[#14A800]"
                          }`}
                        >
                          {p}
                        </Link>
                      );
                    })}
                    {pages > 7 && (
                      <span className="px-2 text-gray-400 text-sm">... {pages}</span>
                    )}
                  </div>

                  {page < pages && (
                    <Link href={buildUrl({ page: String(page + 1) })} className="btn-secondary py-2 px-4 text-sm">
                      Далее →
                    </Link>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-16 text-center">
              <div className="text-5xl mb-4">🔍</div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">Задач не найдено</h2>
              <p className="text-gray-500 mb-6 text-sm max-w-sm mx-auto">
                Попробуйте изменить фильтры или создайте свою задачу
              </p>
              <div className="flex gap-3 justify-center">
                <Link href="/tasks" className="btn-secondary text-sm">
                  Сбросить фильтры
                </Link>
                <Link href="/tasks/create" className="btn-primary text-sm">
                  Создать задачу
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
