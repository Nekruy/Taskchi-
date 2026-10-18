import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { requiredLessonIds } from "@/lib/academy";

export const dynamic = "force-dynamic";

const STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
type Status = (typeof STATUSES)[number];

// GET /api/admin/academy/submissions?status=PENDING|APPROVED|REJECTED
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const raw = req.nextUrl.searchParams.get("status") || "PENDING";
    const status: Status = (STATUSES as readonly string[]).includes(raw) ? (raw as Status) : "PENDING";

    const rows = await prisma.submission.findMany({
      where: { status },
      orderBy: status === "PENDING" ? { createdAt: "asc" } : { reviewedAt: "desc" },
      select: {
        id: true,
        status: true,
        workUrl: true,
        comment: true,
        createdAt: true,
        reviewedAt: true,
        feedback: true,
        enrollment: {
          select: {
            user: { select: { id: true, name: true, email: true, phone: true, avatar: true } },
            track: {
              select: {
                slug: true,
                titleRu: true,
                lessons: { select: { id: true, type: true } },
              },
            },
            progress: { select: { lessonId: true } },
          },
        },
      },
    });

    const submissions = rows.map((s) => {
      const required = requiredLessonIds(s.enrollment.track.lessons);
      const done = new Set(s.enrollment.progress.map((p) => p.lessonId));
      const { user, track } = s.enrollment;
      return {
        id: s.id,
        status: s.status,
        workUrl: s.workUrl,
        comment: s.comment,
        createdAt: s.createdAt,
        reviewedAt: s.reviewedAt,
        feedback: s.feedback,
        user: { id: user.id, name: user.name, email: user.email, phone: user.phone, avatarUrl: user.avatar },
        track: { slug: track.slug, titleRu: track.titleRu },
        progress: { completed: required.filter((id) => done.has(id)).length, total: required.length },
      };
    });

    return NextResponse.json({ submissions });
  } catch (err) {
    console.error("[Admin academy submissions GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
