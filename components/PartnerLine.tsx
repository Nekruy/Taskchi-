/** «Курс от <логотип> Alif Academy» — строка партнёра на карточке и в шапке трека. Для курсов Taskchi (partner = null) ничего не рендерит. */
export function PartnerLine({
  partner,
  className = "",
}: {
  partner: { name: string; logoUrl: string | null; websiteUrl: string | null } | null | undefined;
  className?: string;
}) {
  if (!partner) return null;
  const inner = (
    <>
      {partner.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={partner.logoUrl} alt={partner.name} className="h-5 w-auto max-w-[80px] object-contain rounded" />
      )}
      <span className="font-semibold">{partner.name}</span>
    </>
  );
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-gray-500 ${className}`}>
      Курс от
      {partner.websiteUrl ? (
        <a
          href={partner.websiteUrl}
          target="_blank"
          rel="nofollow noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-gray-700 hover:text-[#14A800] transition-colors"
        >
          {inner}
        </a>
      ) : (
        <span className="inline-flex items-center gap-1.5 text-gray-700">{inner}</span>
      )}
    </span>
  );
}
