import { CATEGORY_MAP } from "@/lib/categories";

interface Props {
  /** Допуски из ExecutorCategory (source = ACADEMY). Если пусто — бейдж не рендерится. */
  badges: Array<{ category: string; trackTitleRu: string | null }>;
  className?: string;
}

/** «🎓 Taskchi Academy» — зелёный бейдж выпускника; при наведении — название трека и категория. */
export function AcademyBadge({ badges, className = "" }: Props) {
  if (!badges || badges.length === 0) return null;
  const title = badges
    .map((b) => {
      const cat = CATEGORY_MAP[b.category]?.label ?? b.category;
      return b.trackTitleRu ? `${b.trackTitleRu} · ${cat}` : cat;
    })
    .join("; ");
  return (
    <span className={`badge-open ${className}`} title={title}>
      🎓 Taskchi Academy
    </span>
  );
}
