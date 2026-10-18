import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { LearnTabs } from "@/components/learn/LearnTabs";

export const dynamic = "force-dynamic";

/** Общая обёртка кабинета: вкладки + «→ Режим работы». Защита сессией — в страницах (точный callbackUrl); сертификат публичный. */
export default async function LearnLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);
  const workHref = session?.user?.role === "EXECUTOR" ? "/executor" : "/customer";
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8">
      {session?.user?.id && <LearnTabs workHref={workHref} />}
      {children}
    </div>
  );
}
