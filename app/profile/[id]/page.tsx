import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileClient } from "./ProfileClient";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const user = await prisma.user.findUnique({
    where: { id: params.id },
    select: { name: true },
  });
  return { title: user?.name || "Профиль" };
}

export default async function ProfilePage({ params }: { params: { id: string } }) {
  const [user, session] = await Promise.all([
    prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        avatar: true,
        bio: true,
        city: true,
        rating: true,
        reviewCount: true,
        isVerified: true,
        createdAt: true,
        phone: true,
        telegramHandle: true,
        tasksCreated: {
          where: { status: "DONE" },
          select: { id: true, title: true, budget: true, createdAt: true },
          take: 5,
        },
        tasksExecuted: {
          where: { status: "DONE" },
          select: { id: true, title: true, budget: true, createdAt: true },
          take: 5,
        },
        reviewsReceived: {
          include: {
            giver: { select: { id: true, name: true, avatar: true } },
          },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    }),
    getServerSession(authOptions),
  ]);

  if (!user) notFound();

  return <ProfileClient user={user as never} session={session} />;
}
