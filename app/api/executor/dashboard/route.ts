import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = token.id as string;

  const [user, activeTasks, completedTasks] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatar: true,
        passportStatus: true,
        passportNote: true,
        rating: true,
        reviewCount: true,
        workArea: true,
        city: true,
        isAvailable: true,
        skills: true,
        headline: true,
        about: true,
        createdAt: true,
        lastName: true,
        gender: true,
        birthDate: true,
        education: true,
        educationField: true,
        extraSkills: true,
        hasCar: true,
        workWeekends: true,
        profession: true,
      },
    }),
    prisma.task.findMany({
      where: { executorId: userId, status: "IN_PROGRESS" },
      include: {
        creator: { select: { id: true, name: true } },
        chat: { select: { id: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.task.findMany({
      where: { executorId: userId, status: "DONE" },
      include: { creator: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  if (!user) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const earned = completedTasks.reduce((sum, t) => sum + t.budget, 0);

  return NextResponse.json({ user, activeTasks, completedTasks, earned });
}
