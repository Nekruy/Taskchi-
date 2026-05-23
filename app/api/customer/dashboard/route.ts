import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = token.id as string;

  const taskInclude = {
    executor: { select: { id: true, name: true, rating: true, avatar: true } },
    _count: { select: { offers: true } },
  } as const;

  const [activeTasks, reviewTasks, completedTasks, cancelledTasks, givenReviews] =
    await Promise.all([
      prisma.task.findMany({
        where: { creatorId: userId, status: { in: ["OPEN", "IN_PROGRESS"] } },
        include: taskInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.task.findMany({
        where: { creatorId: userId, status: "REVIEW" },
        include: taskInclude,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.task.findMany({
        where: { creatorId: userId, status: "DONE" },
        include: taskInclude,
        orderBy: { updatedAt: "desc" },
      }),
      prisma.task.findMany({
        where: { creatorId: userId, status: "CANCELLED" },
        orderBy: { updatedAt: "desc" },
      }),
      prisma.review.findMany({
        where: { giverId: userId },
        select: { taskId: true },
      }),
    ]);

  const reviewedTaskIds = new Set(givenReviews.map((r) => r.taskId));
  const totalSpent = completedTasks.reduce((s, t) => s + t.budget, 0);

  // Last 5 unique executors from completed tasks
  const executorMap = new Map<string, { id: string; name: string; rating: number; avatar: string | null }>();
  for (const task of completedTasks) {
    if (task.executor && !executorMap.has(task.executor.id)) {
      executorMap.set(task.executor.id, task.executor);
      if (executorMap.size >= 5) break;
    }
  }

  return NextResponse.json({
    activeTasks,
    reviewTasks,
    completedTasks: completedTasks.map((t) => ({ ...t, hasReview: reviewedTaskIds.has(t.id) })),
    cancelledTasks,
    totalSpent,
    recentExecutors: Array.from(executorMap.values()),
  });
}
