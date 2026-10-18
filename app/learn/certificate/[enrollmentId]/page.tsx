import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { certificateNumber, formatDateRu } from "@/lib/learn";
import { CertificateActions } from "@/components/learn/CertificateActions";

export const dynamic = "force-dynamic";

async function load(enrollmentId: string) {
  return prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    select: {
      id: true, status: true, completedAt: true,
      user: { select: { name: true, lastName: true } },
      track: { select: { titleRu: true, estimatedHours: true, partner: { select: { name: true, logoUrl: true } }, _count: { select: { lessons: true } } } },
    },
  });
}

export async function generateMetadata({ params }: { params: { enrollmentId: string } }): Promise<Metadata> {
  const e = await load(params.enrollmentId);
  if (!e || e.status !== "COMPLETED") return { title: "Сертификат не найден" };
  return { title: `Сертификат — ${e.track.titleRu}`, description: `${e.user.name} прошёл курс «${e.track.titleRu}» в Taskchi Academy` };
}

/** Публичная страница сертификата: без сессии, 404 если курс не завершён. */
export default async function CertificatePage({ params }: { params: { enrollmentId: string } }) {
  const e = await load(params.enrollmentId);
  if (!e || e.status !== "COMPLETED") notFound();
  const name = `${e.user.name}${e.user.lastName ? ` ${e.user.lastName}` : ""}`;
  const date = e.completedAt ?? new Date();
  const number = certificateNumber(e.id);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="certificate card md:p-12 p-6 text-center relative overflow-hidden border-2 border-[#14A800]/30 print:border-[#14A800] print:shadow-none">
        <div className="absolute inset-3 rounded-xl border border-[#14A800]/20 pointer-events-none" aria-hidden="true" />
        <div className="flex items-center justify-center gap-2 mb-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Taskchi" style={{ height: 36 }} />
          <span className="text-sm font-bold tracking-widest uppercase text-[#14A800]">Academy</span>
        </div>
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500 mb-3">Сертификат</p>
        <p className="text-gray-600">подтверждает, что</p>
        <h1 className="text-3xl md:text-5xl font-extrabold text-gray-900 tracking-tight my-3">{name}</h1>
        <p className="text-gray-600">успешно прошёл(ла) курс</p>
        <h2 className="text-2xl md:text-3xl font-extrabold text-[#14A800] my-3">«{e.track.titleRu}»</h2>
        <p className="text-sm text-gray-500">
          {e.track._count.lessons} уроков · ~{e.track.estimatedHours} ч · итоговое задание принято
        </p>
        {e.track.partner && (
          <p className="inline-flex items-center gap-2 text-sm text-gray-600 mt-3">
            Курс от
            {e.track.partner.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={e.track.partner.logoUrl} alt={e.track.partner.name} className="h-5 w-auto object-contain" />
            )}
            <span className="font-semibold">{e.track.partner.name}</span>
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-10 pt-6 border-t border-gray-100 text-xs text-gray-500">
          <span>Дата: <span className="font-semibold text-gray-700">{formatDateRu(date)}</span></span>
          <span>№ <span className="font-mono font-semibold text-gray-700">{number}</span></span>
          <span>taskchi.tj/learn/certificate</span>
        </div>
      </div>
      <div className="mt-6 flex justify-center">
        <CertificateActions />
      </div>
    </div>
  );
}
