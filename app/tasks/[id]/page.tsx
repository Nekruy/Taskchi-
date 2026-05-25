import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TaskDetailClient } from "./TaskDetailClient";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

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

async function TaskDetailServer({ params }: { params: { id: string } }) {
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

export default function TaskDetailPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#14A800] border-t-transparent rounded-full" />
      </div>
    }>
      <TaskDetailServer params={params} />
    </Suspense>
  );
}
