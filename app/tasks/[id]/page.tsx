import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskDetailClient } from "./TaskDetailClient";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    select: { title: true, description: true },
  });
  if (!task) return { title: "Задача не найдена" };
  return {
    title: task.title,
    description: task.description.slice(0, 160),
  };
}

export default async function TaskDetailPage({ params }: { params: { id: string } }) {
  const [task, session] = await Promise.all([
    prisma.task.findUnique({
      where: { id: params.id },
      include: {
        creator: {
          select: {
            id: true, name: true, avatar: true,
            rating: true, reviewCount: true, city: true, bio: true, createdAt: true,
          },
        },
        executor: {
          select: { id: true, name: true, avatar: true, rating: true, reviewCount: true },
        },
        offers: {
          include: {
            executor: {
              select: { id: true, name: true, avatar: true, rating: true, reviewCount: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
        contract: { select: { id: true, status: true, pdfUrl: true } },
        escrow: { select: { id: true, status: true, amount: true, commission: true } },
        chat: { select: { id: true } },
        _count: { select: { offers: true } },
      },
    }),
    getServerSession(authOptions),
  ]);

  if (!task) notFound();

  return <TaskDetailClient task={task as never} session={session} />;
}
