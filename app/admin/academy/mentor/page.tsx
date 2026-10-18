"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AcademyTabs } from "../AcademyTabs";

interface Row {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  user: { id: string; name: string; email: string };
  lesson: { id: string; order: number; titleRu: string; track: { id: string; titleRu: string } };
}
interface TrackOpt {
  id: string;
  titleRu: string;
  lessons: { id: string; order: number; titleRu: string }[];
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminMentorPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [tracks, setTracks] = useState<TrackOpt[]>([]);
  const [stats, setStats] = useState({ today: 0, week: 0, weekUsers: 0 });
  const [trackId, setTrackId] = useState("");
  const [lessonId, setLessonId] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  async function load() {
    setLoading(true);
    setError("");
    try {
      const qs = new URLSearchParams({ take: "200" });
      if (trackId) qs.set("trackId", trackId);
      if (lessonId) qs.set("lessonId", lessonId);
      const res = await fetch(`/api/admin/academy/mentor?${qs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || `Не удалось загрузить (${res.status})`);
        return;
      }
      setRows(data.messages ?? []);
      setTracks(data.tracks ?? []);
      setStats(data.stats ?? { today: 0, week: 0, weekUsers: 0 });
    } catch {
      setError("Нет связи с сервером");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackId, lessonId]);

  const lessons = tracks.find((t) => t.id === trackId)?.lessons ?? [];

  return (
    <div className="p-6 max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Академия — ИИ-наставник</h1>
      <AcademyTabs />

      <div className="grid grid-cols-3 gap-3 mb-5 max-w-xl">
        {[
          ["Сообщений сегодня", stats.today],
          ["За 7 дней", stats.week],
          ["Учеников за 7 дней", stats.weekUsers],
        ].map(([l, v]) => (
          <div key={String(l)} className="card p-4">
            <p className="text-xs text-gray-500">{l}</p>
            <p className="text-2xl font-extrabold text-gray-900">{v}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <select
          value={trackId}
          onChange={(e) => {
            setTrackId(e.target.value);
            setLessonId("");
          }}
          className="input-field w-auto min-w-[220px]"
        >
          <option value="">Все курсы</option>
          {tracks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.titleRu}
            </option>
          ))}
        </select>
        <select value={lessonId} onChange={(e) => setLessonId(e.target.value)} className="input-field w-auto min-w-[260px]" disabled={!trackId}>
          <option value="">Все уроки</option>
          {lessons.map((l) => (
            <option key={l.id} value={l.id}>
              {l.order}. {l.titleRu}
            </option>
          ))}
        </select>
        <button type="button" onClick={load} className="btn-secondary">
          Обновить
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin w-8 h-8 border-2 border-[#14A800] border-t-transparent rounded-full" />
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-4xl mb-3">🎓</div>
          <p>Сообщений пока нет</p>
        </div>
      ) : (
        <div className="card p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs text-gray-500 text-left">
              <tr>
                <th className="px-3 py-2 whitespace-nowrap">Дата</th>
                <th className="px-3 py-2">Ученик</th>
                <th className="px-3 py-2">Урок</th>
                <th className="px-3 py-2">Роль</th>
                <th className="px-3 py-2 w-[45%]">Текст</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((r) => {
                const isOpen = expanded.has(r.id);
                return (
                  <tr key={r.id} className="align-top">
                    <td className="px-3 py-2 whitespace-nowrap text-gray-500 text-xs">{fmt(r.createdAt)}</td>
                    <td className="px-3 py-2">
                      <Link href={`/profile/${r.user.id}`} className="font-semibold text-gray-900 hover:text-[#14A800]">
                        {r.user.name}
                      </Link>
                      <div className="text-xs text-gray-400">{r.user.email}</div>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {r.lesson.track.titleRu} · №{r.lesson.order}
                    </td>
                    <td className="px-3 py-2">
                      <span className={r.role === "user" ? "badge-progress" : "badge-open"}>{r.role === "user" ? "ученик" : "наставник"}</span>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((s) => {
                            const n = new Set(s);
                            if (n.has(r.id)) n.delete(r.id);
                            else n.add(r.id);
                            return n;
                          })
                        }
                        className={`text-left text-gray-800 whitespace-pre-wrap break-words ${isOpen ? "" : "line-clamp-3"}`}
                        title={isOpen ? "Свернуть" : "Раскрыть"}
                      >
                        {r.content}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
