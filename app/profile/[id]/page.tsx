import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: {
      name: true,
      headline: true,
      rating: true,
      _count: { select: { tasksExecuted: { where: { status: "DONE" } } } },
    },
  });
  if (!user) return { title: "Профиль — Taskchi" };

  const parts: string[] = [];
  if (user.headline) parts.push(user.headline);
  if (user.rating > 0) parts.push(`Рейтинг ${user.rating.toFixed(1)}`);
  if (user._count.tasksExecuted > 0)
    parts.push(`${user._count.tasksExecuted} выполненных задач`);

  return {
    title: `${user.name} — исполнитель на Taskchi`,
    description: parts.join(" · ") || "Исполнитель на платформе Taskchi (Душанбе, Таджикистан)",
  };
}

export default async function ProfilePage({ params }: { params: { id: string } }) {
  // Session is OPTIONAL — profile is fully public
  const [user, session] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        about: true,
        headline: true,
        city: true,
        rating: true,
        reviewCount: true,
        isVerified: true,
        isChildVerified: true,
        createdAt: true,
        phone: true,
        telegramHandle: true,
        role: true,
        skills: true,
        workArea: true,
        passportStatus: true,
        verification: { select: { status: true } },
        tasksExecuted: {
          where: { status: "DONE" },
          select: {
            id: true,
            title: true,
            category: true,
            budget: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: "desc" },
        },
        reviewsReceived: {
          select: {
            id: true,
            rating: true,
            comment: true,
            taskId: true,
            createdAt: true,
            giver: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    }),
    getServerSession(authOptions),
  ]);

  if (!user) notFound();

  return <ProfileClient user={user as never} session={session} />;
}
