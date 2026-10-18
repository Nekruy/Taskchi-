"use client";

import { useEffect, useState } from "react";
import { AcademyTabs, Toast } from "../AcademyTabs";

interface Partner {
  id: string;
  slug: string;
  name: string;
  logoUrl: string | null;
  websiteUrl: string | null;
  descriptionRu: string;
  isActive: boolean;
  _count: { tracks: number };
}

interface Form {
  slug: string;
  name: string;
  logoUrl: string;
  websiteUrl: string;
  descriptionRu: string;
  isActive: boolean;
}
const EMPTY: Form = { slug: "", name: "", logoUrl: "", websiteUrl: "", descriptionRu: "", isActive: true };

export default function AdminPartnersPage() {
  const [rows, setRows] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState("");
  const [editingId, setEditingId] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));
  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(""), 2000);
  };

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/academy/partners");
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Не удалось загрузить партнёров (${res.status})`);
        return;
      }
      setRows(data.partners ?? []);
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, []);

  function startEdit(p: Partner | null) {
    setFormError("");
    if (p) {
      setEditingId(p.id);
      setForm({ slug: p.slug, name: p.name, logoUrl: p.logoUrl ?? "", websiteUrl: p.websiteUrl ?? "", descriptionRu: p.descriptionRu, isActive: p.isActive });
    } else {
      setEditingId("new");
      setForm(EMPTY);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setFormError("");
    if (!/^[a-z0-9-]{2,40}$/.test(form.slug)) return setFormError("Slug: 2–40 символов, только a-z, 0-9 и дефис");
    if (form.name.trim().length < 2) return setFormError("Название минимум 2 символа");
    if (form.descriptionRu.trim().length < 10) return setFormError("Описание минимум 10 символов");
    setSaving(true);
    try {
      const isNew = editingId === "new";
      const res = await fetch(isNew ? "/api/admin/academy/partners" : `/api/admin/academy/partners/${editingId}`, {
        method: isNew ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.slug.trim(),
          name: form.name.trim(),
          logoUrl: form.logoUrl.trim(),
          websiteUrl: form.websiteUrl.trim(),
          descriptionRu: form.descriptionRu.trim(),
          isActive: form.isActive,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFormError(data.error || `Ошибка ${res.status}`);
        return;
      }
      setEditingId(null);
      showToast("Сохранено");
      await load();
    } catch {
      setFormError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  async function remove(p: Partner) {
    if (!window.confirm(`Удалить партнёра «${p.name}»?`)) return;
    setBusy(p.id);
    setError("");
    try {
      const res = await fetch(`/api/admin/academy/partners/${p.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Ошибка ${res.status}`);
        return;
      }
      showToast("Партнёр удалён");
      await load();
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setBusy(null);
    }
  }

  const formBlock = (
    <form onSubmit={save} className="card bg-primary-50/40 border-[#14A800]/30 space-y-3 mb-4">
      <h3 className="font-bold text-gray-900">{editingId === "new" ? "Новый партнёр" : "Изменить партнёра"}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-gray-600">Название</span>
          <input value={form.name} onChange={(e) => set("name", e.target.value)} className="input-field mt-1" placeholder="Alif Academy" required />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-600">Slug</span>
          <input value={form.slug} onChange={(e) => set("slug", e.target.value)} className="input-field mt-1 font-mono text-xs" placeholder="alif-academy" pattern="[a-z0-9-]{2,40}" required />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-gray-600">Сайт (https://)</span>
          <input type="url" value={form.websiteUrl} onChange={(e) => set("websiteUrl", e.target.value)} className="input-field mt-1" placeholder="https://alif.academy" />
        </label>
        <div className="grid grid-cols-[1fr_72px] gap-3 items-end">
          <label className="block">
            <span className="text-xs font-semibold text-gray-600">Логотип (https://, картинка)</span>
            <input type="url" value={form.logoUrl} onChange={(e) => set("logoUrl", e.target.value)} className="input-field mt-1" placeholder="https://…/logo.png" />
          </label>
          {form.logoUrl.startsWith("https://") ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={form.logoUrl} alt="Превью" className="w-[72px] h-[46px] object-contain rounded-lg border border-gray-100 bg-white" />
          ) : (
            <div className="w-[72px] h-[46px] rounded-lg border border-dashed border-gray-200" />
          )}
        </div>
      </div>
      <label className="block">
        <span className="text-xs font-semibold text-gray-600">Описание (RU)</span>
        <textarea value={form.descriptionRu} onChange={(e) => set("descriptionRu", e.target.value)} rows={3} className="input-field mt-1 resize-y" required />
      </label>
      <label className="flex items-center gap-2 cursor-pointer select-none">
        <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} className="w-4 h-4 accent-[#14A800]" />
        <span className="text-sm font-semibold text-gray-700">Активен</span>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
        <button type="button" onClick={() => setEditingId(null)} disabled={saving} className="btn-secondary">
          Отмена
        </button>
        {formError && <span className="text-sm text-red-600">{formError}</span>}
      </div>
    </form>
  );

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Академия — партнёры</h1>
      <AcademyTabs />

      <div className="flex items-center justify-between gap-3 mb-5">
        <p className="text-sm text-gray-500">Партнёры указываются как авторы курсов: «Курс от Alif Academy»</p>
        <div className="flex items-center gap-3">
          <Toast text={toast} />
          {editingId === null && (
            <button type="button" onClick={() => startEdit(null)} className="btn-primary">
              + Новый партнёр
            </button>
          )}
        </div>
      </div>

      {editingId === "new" && formBlock}
      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-[#14A800] border-t-transparent rounded-full" />
        </div>
      ) : rows.length === 0 && editingId !== "new" ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🤝</div>
          <p>Партнёров пока нет</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((p) =>
            editingId === p.id ? (
              <div key={p.id}>{formBlock}</div>
            ) : (
              <div key={p.id} className="card flex items-start gap-4">
                {p.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.logoUrl} alt={p.name} className="w-16 h-12 object-contain rounded-lg border border-gray-100 bg-white shrink-0" />
                ) : (
                  <div className="w-16 h-12 rounded-lg bg-primary-50 flex items-center justify-center text-2xl shrink-0">🤝</div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-bold text-gray-900">{p.name}</h2>
                    <span className={p.isActive ? "badge-open" : "badge-done"}>{p.isActive ? "Активен" : "Неактивен"}</span>
                    <span className="text-xs text-gray-400 font-mono">{p.slug}</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">{p.descriptionRu}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {p._count.tracks} {p._count.tracks === 1 ? "курс" : p._count.tracks < 5 && p._count.tracks > 0 ? "курса" : "курсов"}
                    {p.websiteUrl && (
                      <>
                        {" · "}
                        <a href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-[#14A800] hover:underline">
                          {p.websiteUrl.replace(/^https?:\/\//, "")}
                        </a>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                  <button type="button" onClick={() => startEdit(p)} className="btn-secondary py-1.5 px-4 text-xs">
                    Изменить
                  </button>
                  <button type="button" onClick={() => remove(p)} disabled={busy === p.id} className="btn-ghost py-1.5 px-3 text-xs text-red-600">
                    {busy === p.id ? "..." : "Удалить"}
                  </button>
                </div>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
