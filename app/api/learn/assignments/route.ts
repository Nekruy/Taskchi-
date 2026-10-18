import { NextResponse } from "next/server";
import { requireUser } from "@/lib/learn-session";
import { getCourseCards } from "@/lib/learn";

export const dynamic = "force-dynamic";

// GET /api/learn/assignments — задания: сданные + готовые к сдаче
export async function GET() {
  const { userId, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    const cards = await getCourseCards(userId);
    const assignments = cards
      .filter((c) => c.submission !== "NONE")
      .map((c) => ({
        enrollmentId: c.enrollmentId,
        slug: c.slug,
        titleRu: c.titleRu,
        status: c.submission,
        date: c.submissionDate,
        feedback: c.feedback,
        taskLessonId: c.taskLessonId,
        certificate: c.status === "COMPLETED" ? `/learn/certificate/${c.enrollmentId}` : null,
      }));
    return NextResponse.json({ assignments });
  } catch (err) {
    console.error("[Learn assignments GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
