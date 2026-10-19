"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/categories";
import { AcademyTabs, Toast } from "../AcademyTabs";
import { LessonFormClient, type AdminLesson } from "./LessonFormClient";
import { BlocksEditor } from "./BlocksEditor";

interface PartnerOpt {
  id: string;
  name: string;
  isActive: boolean;
}

interface TrackForm {
  slug: string;
  titleRu: string;
  titleTj: string;
  descriptionRu: string;
  descriptionTj: string;
  coverUrl: string;
  taskCategory: string;
  estimatedHours: string;
  order: string;
  isPublished: boolean;
  partnerId: string;
}

const EMPTY: TrackForm = {
  slug: "",
  titleRu: "",
  titleTj: "",
  descriptionRu: "",
  descriptionTj: "",
  coverUrl: "",
  taskCategory: "DIGITAL",
  estimatedHours: "6",
  order: "1",
  isPublished: false,
  partnerId: "",
};

const TYPE_ICON: Record<string, string> = { VIDEO: "🎬", EXTERNAL: "▶", TEXT: "📄", TASK: "✅" };

export function TrackFormClient({ trackId }: { trackId?: string }) {
  const router = useRouter();
  const [form, setForm] = useState<TrackForm>(EMPTY);
  const [slugTouched, setSlugTouched] = useState(!!trackId);
  const [partners, setPartners] = useState<PartnerOpt[]>([]);
  const [lessons, setLessons] = useState<AdminLesson[]>([]);
  const [enrollments, setEnrollments] = useState(0);
  const [loading, setLoading] = useState(!!trackId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lessonError, setLessonError] = useState("");
  const [toast, setToast] = useState("");
  const [editing, setEditing] = useState<AdminLesson | null | "new">(null);
  const [busyLesson, setBusyLesson] = useState<string | null>(null);

  function set<K extends keyof TrackForm>(k: K, v: TrackForm[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function showToast(t: string) {
    setToast(t);
    setTimeout(() => setToast(""), 2000);
  }

  async function loadTrack() {
    if (!trackId) return;
    const res = await fetch(`/api/admin/academy/tracks/${trackId}`);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || `Не удалось загрузить курс (${res.status})`);
      return;
    }
    const t = data.track;
    setForm({
      slug: t.slug,
      titleRu: t.titleRu,
      titleTj: t.titleTj,
      descriptionRu: t.descriptionRu,
      descriptionTj: t.descriptionTj,
      coverUrl: t.coverUrl ?? "",
      taskCategory: t.taskCategory,
      estimatedHours: String(t.estimatedHours),
      order: String(t.order),
      isPublished: t.isPublished,
      partnerId: t.partnerId ?? "",
    });
    setLessons(t.lessons ?? []);
    setEnrollments(t._count?.enrollments ?? 0);
  }

  useEffect(() => {
    (async () => {
      try {
        const pres = await fetch("/api/admin/academy/partners");
        const pdata = await pres.json().catch(() => ({}));
        if (pres.ok) setPartners(pdata.partners ?? []);
        await loadTrack();
      } catch {
        setError("Нет связи с сервером");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId]);

  // slug из названия, пока админ его не трогал
  useEffect(() => {
    if (slugTouched || trackId) return;
    const map: Record<string, string> = { а:"a",б:"b",в:"v",г:"g",д:"d",е:"e",ё:"e",ж:"zh",з:"z",и:"i",й:"y",к:"k",л:"l",м:"m",н:"n",о:"o",п:"p",р:"r",с:"s",т:"t",у:"u",ф:"f",х:"h",ц:"c",ч:"ch",ш:"sh",щ:"sch",ъ:"",ы:"y",ь:"",э:"e",ю:"yu",я:"ya",ӣ:"i",ӯ:"u",ҳ:"h",қ:"q",ғ:"g",ҷ:"j" };
    const slug = form.titleRu.toLowerCase().split("").map((ch) => map[ch] ?? ch).join("").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
    setForm((f) => ({ ...f, slug }));
  }, [form.titleRu, slugTouched, trackId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (form.titleRu.trim().length < 3) return setError("Название минимум 3 символа");
    if (form.descriptionRu.trim().length < 10) return setError("Описание минимум 10 символов");
    setSaving(true);
    try {
      const body = {
        slug: form.slug.trim(),
        titleRu: form.titleRu.trim(),
        titleTj: form.titleTj.trim() || form.titleRu.trim(),
        descriptionRu: form.descriptionRu.trim(),
        descriptionTj: form.descriptionTj.trim() || form.descriptionRu.trim(),
        coverUrl: form.coverUrl.trim() || null,
        taskCategory: form.taskCategory,
        estimatedHours: Number(form.estimatedHours),
        order: Number(form.order),
        isPublished: form.isPublished,
        partnerId: form.partnerId || null,
      };
      const res = await fetch(trackId ? `/api/admin/academy/tracks/${trackId}` : "/api/admin/academy/tracks", {
        method: trackId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Ошибка ${res.status}`);
        return;
      }
      showToast("Сохранено");
      if (!trackId) router.replace(`/admin/academy/tracks/${data.track.id}`);
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setSaving(false);
    }
  }

  async function move(l: AdminLesson, direction: "up" | "down") {
    setBusyLesson(l.id);
    setLessonError("");
    try {
      const res = await fetch(`/api/admin/academy/lessons/${l.id}/move`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ direction }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLessonError(data.error || `Ошибка ${res.status}`);
        return;
      }
      await loadTrack();
    } catch {
      setLessonError("Нет связи с сервером");
    } finally {
      setBusyLesson(null);
    }
  }

  async function remove(l: AdminLesson) {
    if (!window.confirm(`Удалить урок «${l.titleRu}»?`)) return;
    setBusyLesson(l.id);
    setLessonError("");
    try {
      const res = await fetch(`/api/admin/academy/lessons/${l.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLessonError(data.error || `Ошибка ${res.status}`);
        return;
      }
      showToast("Урок удалён");
      await loadTrack();
    } catch {
      setLessonError("Нет связи с сервером");
    } finally {
      setBusyLesson(null);
    }
  }

  async function removeTrack() {
    if (!trackId || !window.confirm("Удалить курс целиком вместе с уроками?")) return;
    setError("");
    const res = await fetch(`/api/admin/academy/tracks/${trackId}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || `Ошибка ${res.status}`);
      return;
    }
    router.replace("/admin/academy/tracks");
  }

  const nextOrder = lessons.length ? Math.max(...lessons.map((l) => l.order)) + 1 : 1;

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">{trackId ? "Академия — курс" : "Академия — новый курс"}</h1>
      <AcademyTabs />

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <Link href="/admin/academy/tracks" className="btn-ghost -ml-3 text-gray-500">
          ← Все курсы
        </Link>
        {trackId && form.slug && (
          <a href={`/academy/${form.slug}`} target="_blank" rel="noopener noreferrer" className="btn-ghost text-xs">
            Открыть на сайте ↗
          </a>
        )}
        <Toast text={toast} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-[#14A800] border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <form onSubmit={save} className="card space-y-4 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Название (RU)</span>
                <input value={form.titleRu} onChange={(e) => set("titleRu", e.target.value)} className="input-field mt-1" required />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Название (TJ) — пусто = как RU</span>
                <input value={form.titleTj} onChange={(e) => set("titleTj", e.target.value)} className="input-field mt-1" />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Описание (RU)</span>
                <textarea value={form.descriptionRu} onChange={(e) => set("descriptionRu", e.target.value)} rows={4} className="input-field mt-1 resize-y" required />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Описание (TJ) — пусто = как RU</span>
                <textarea value={form.descriptionTj} onChange={(e) => set("descriptionTj", e.target.value)} rows={4} className="input-field mt-1 resize-y" />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="block md:col-span-2">
                <span className="text-xs font-semibold text-gray-600">Slug (адрес /academy/…)</span>
                <input
                  value={form.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    set("slug", e.target.value);
                  }}
                  className="input-field mt-1 font-mono text-xs"
                  pattern="[a-z0-9-]{2,40}"
                  required
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Часов</span>
                <input type="number" min={1} value={form.estimatedHours} onChange={(e) => set("estimatedHours", e.target.value)} className="input-field mt-1" required />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Порядок в каталоге</span>
                <input type="number" min={0} value={form.order} onChange={(e) => set("order", e.target.value)} className="input-field mt-1" required />
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Категория допуска</span>
                <select value={form.taskCategory} onChange={(e) => set("taskCategory", e.target.value)} className="input-field mt-1">
                  {CATEGORIES.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.emoji} {c.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Партнёр</span>
                <select value={form.partnerId} onChange={(e) => set("partnerId", e.target.value)} className="input-field mt-1">
                  <option value="">— Taskchi —</option>
                  {partners.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {!p.isActive ? " (неактивен)" : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 mt-6 cursor-pointer select-none">
                <input type="checkbox" checked={form.isPublished} onChange={(e) => set("isPublished", e.target.checked)} className="w-4 h-4 accent-[#14A800]" />
                <span className="text-sm font-semibold text-gray-700">Опубликован</span>
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-3 items-start">
              <label className="block">
                <span className="text-xs font-semibold text-gray-600">Обложка — ссылка на картинку (16:9)</span>
                <input type="url" value={form.coverUrl} onChange={(e) => set("coverUrl", e.target.value)} className="input-field mt-1" placeholder="https://…/cover.jpg" />
              </label>
              {form.coverUrl.startsWith("https://") && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={form.coverUrl} alt="Превью обложки" className="w-full aspect-video object-cover rounded-xl border border-gray-100 mt-5" />
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button type="submit" disabled={saving} className="btn-primary">
                {saving ? "Сохраняем..." : trackId ? "Сохранить" : "Создать курс"}
              </button>
              {trackId && (
                <button type="button" onClick={removeTrack} className="btn-ghost text-red-600 text-xs" title={enrollments > 0 ? "Есть записи — удалить нельзя" : ""}>
                  Удалить курс
                </button>
              )}
              {error && <span className="text-sm text-red-600">{error}</span>}
            </div>
          </form>

          {trackId && (
            <section>
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="text-lg font-extrabold text-gray-900">Уроки ({lessons.length})</h2>
                {editing === null && (
                  <button type="button" onClick={() => setEditing("new")} className="btn-primary py-1.5 px-4 text-xs">
                    + Добавить урок
                  </button>
                )}
              </div>
              {lessonError && <p className="text-sm text-red-600 mb-3">{lessonError}</p>}

              {editing === "new" && (
                <div className="mb-4">
                  <LessonFormClient trackId={trackId} lesson={null} defaultOrder={nextOrder} onCancel={() => setEditing(null)} onSaved={async () => { setEditing(null); showToast("Сохранено"); await loadTrack(); }} />
                </div>
              )}

              <div className="card p-0 overflow-hidden divide-y divide-[#f0f9f0]">
                {lessons.length === 0 && editing !== "new" && (
                  <p className="text-center text-gray-400 text-sm py-8">Уроков пока нет</p>
                )}
                {lessons.map((l, i) =>
                  editing && editing !== "new" && editing.id === l.id ? (
                    <div key={l.id} className="p-3">
                      <LessonFormClient trackId={trackId} lesson={l} defaultOrder={l.order} onCancel={() => setEditing(null)} onSaved={async () => { setEditing(null); showToast("Сохранено"); await loadTrack(); }} />
                      <BlocksEditor lessonId={l.id} />
                    </div>
                  ) : (
                    <div key={l.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <span className="w-8 text-center font-bold text-gray-500">{l.order}</span>
                      <span className="w-6 text-center" title={l.type}>{TYPE_ICON[l.type]}</span>
                      <span className="flex-1 min-w-0 truncate font-semibold text-gray-900">{l.titleRu}</span>
                      <span className="w-16 text-right text-gray-400 text-xs">{l.durationMin ? `${l.durationMin} мин` : "—"}</span>
                      <div className="flex items-center gap-1">
                        <button type="button" onClick={() => move(l, "up")} disabled={i === 0 || busyLesson === l.id} className="btn-ghost px-2 py-1 disabled:opacity-30" title="Выше">↑</button>
                        <button type="button" onClick={() => move(l, "down")} disabled={i === lessons.length - 1 || busyLesson === l.id} className="btn-ghost px-2 py-1 disabled:opacity-30" title="Ниже">↓</button>
                        <button type="button" onClick={() => setEditing(l)} disabled={busyLesson === l.id} className="btn-ghost px-2 py-1 text-xs">Изменить</button>
                        <button type="button" onClick={() => remove(l)} disabled={busyLesson === l.id} className="btn-ghost px-2 py-1 text-xs text-red-600">Удалить</button>
                      </div>
                    </div>
                  )
                )}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
