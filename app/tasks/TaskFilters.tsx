"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useCallback } from "react";

const CATEGORIES = [
  { key: "", label: "Все задачи", emoji: "🔍" },
  { key: "CHILDREN", label: "Дети", emoji: "🧒" },
  { key: "SHOPPING", label: "Покупки", emoji: "🛒" },
  { key: "DELIVERY", label: "Доставка", emoji: "🚗" },
  { key: "QUEUE", label: "Очередь", emoji: "⏰" },
  { key: "HOUSEHOLD", label: "Дом", emoji: "🏠" },
  { key: "ONLINE", label: "IT задачи", emoji: "💻" },
];

const SORT_OPTIONS = [
  { value: "newest", label: "Сначала новые" },
  { value: "budget_high", label: "Бюджет: высокий" },
  { value: "budget_low", label: "Бюджет: низкий" },
];

const QUICK_FILTERS = [
  { label: "🆕 Сегодня", key: "today" },
  { label: "🔥 Срочные", key: "urgent" },
];

export function TaskFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get("category") || "";
  const sort = searchParams.get("sort") || "newest";
  const city = searchParams.get("city") || "";
  const minBudget = searchParams.get("min") || "";
  const maxBudget = searchParams.get("max") || "";

  const verifiedOnly = searchParams.get("verified") === "1";
  const [cityInput, setCityInput] = useState(city);
  const [minInput, setMinInput] = useState(minBudget);
  const [maxInput, setMaxInput] = useState(maxBudget);

  const buildUrl = useCallback(
    (overrides: Record<string, string>) => {
      const vals: Record<string, string> = {};
      if (category) vals.category = category;
      if (sort !== "newest") vals.sort = sort;
      if (city) vals.city = city;
      if (minBudget) vals.min = minBudget;
      if (maxBudget) vals.max = maxBudget;
      if (verifiedOnly) vals.verified = "1";
      Object.assign(vals, overrides);
      const p = new URLSearchParams();
      Object.entries(vals).forEach(([k, v]) => { if (v) p.set(k, v); });
      return `/tasks${p.toString() ? `?${p.toString()}` : ""}`;
    },
    [category, sort, city, minBudget, maxBudget, verifiedOnly]
  );

  function applyFilters() {
    router.push(buildUrl({ city: cityInput, min: minInput, max: maxInput }));
  }

  function resetFilters() {
    setCityInput("");
    setMinInput("");
    setMaxInput("");
    router.push("/tasks");
  }

  const hasActiveFilters = !!(category || city || minBudget || maxBudget || sort !== "newest" || verifiedOnly);

  return (
    <aside className="hidden lg:block w-64 shrink-0">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sticky top-20">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-4 h-4 text-[#14A800]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            Фильтры
          </h3>
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-xs text-[#14A800] hover:text-[#0d8c00] font-semibold">
              Сбросить
            </button>
          )}
        </div>

        {/* Quick filters */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            Быстрые фильтры
          </label>
          <div className="flex flex-wrap gap-2">
            {QUICK_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => {
                  if (f.key === "today") {
                    router.push(buildUrl({ sort: "newest" }));
                  }
                }}
                className="px-3 py-1.5 text-xs font-medium bg-gray-50 hover:bg-[#e6f9e6] hover:text-[#0d8c00] border border-gray-200 hover:border-green-200 rounded-full transition-colors"
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Verified filter */}
        <div className="mb-5">
          <label className="flex items-center gap-2.5 cursor-pointer group">
            <div
              onClick={() => router.push(buildUrl({ verified: verifiedOnly ? "" : "1" }))}
              className={`relative w-9 h-5 rounded-full transition-colors ${verifiedOnly ? "bg-[#14A800]" : "bg-gray-200"}`}
            >
              <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${verifiedOnly ? "translate-x-4" : ""}`} />
            </div>
            <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
              ✓ Только верифицированные
            </span>
          </label>
        </div>

        {/* Sort */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            Сортировка
          </label>
          <select
            value={sort}
            onChange={(e) => router.push(buildUrl({ sort: e.target.value }))}
            className="w-full input-field text-sm py-2"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            Категория
          </label>
          <div className="space-y-0.5">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => router.push(buildUrl({ category: cat.key }))}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left ${
                  category === cat.key
                    ? "bg-[#14A800] text-white"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>{cat.emoji}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Budget */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            Бюджет (сомони)
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="От"
              value={minInput}
              onChange={(e) => setMinInput(e.target.value)}
              className="input-field py-2 text-sm"
              min={0}
            />
            <input
              type="number"
              placeholder="До"
              value={maxInput}
              onChange={(e) => setMaxInput(e.target.value)}
              className="input-field py-2 text-sm"
              min={0}
            />
          </div>
        </div>

        {/* City */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">
            Город / район
          </label>
          <input
            type="text"
            placeholder="Душанбе, Шохмансур..."
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            className="input-field py-2 text-sm"
          />
        </div>

        <button onClick={applyFilters} className="btn-primary w-full justify-center">
          Применить
        </button>
      </div>
    </aside>
  );
}
