import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// GET /api/tasks/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const task = await prisma.task.findUnique({
    where: { id: params.id },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          avatar: true,
          rating: true,
          reviewCount: true,
          city: true,
          bio: true,
          createdAt: true,
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
      contract: { select: { id: true, status: true, pdfUrl: true, signedAt: true } },
      escrow: { select: { id: true, status: true, amount: true, commission: true } },
      _count: { select: { offers: true } },
    },
  });

  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  return NextResponse.json({ task });
}

// PATCH /api/tasks/[id]
// Portfolio automation: when status → DONE, the executor's portfolio automatically
// reflects this task because the portfolio is a live query of
//   prisma.task.findMany({ where: { executorId, status: "DONE" } })
// No extra table is needed.
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  // Only creator OR assigned executor may update
  const isCreator = task.creatorId === session.user.id;
  const isExecutor = task.executorId === session.user.id;
  if (!isCreator && !isExecutor) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const body = await req.json();

  // Executors may only transition status (e.g., mark IN_PROGRESS → REVIEW)
  // Creators may update all allowed fields including status → DONE
  const allowedFields = isCreator
    ? ["title", "description", "budget", "address", "deadline", "status"]
    : ["status"];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = field === "deadline" ? new Date(body[field]) : body[field];
    }
  }

  const updated = await prisma.task.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json({ task: updated });
}

// DELETE /api/tasks/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  const task = await prisma.task.findUnique({ where: { id: params.id } });
  if (!task) {
    return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
  }

  if (task.creatorId !== session.user.id) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  if (task.status === "IN_PROGRESS") {
    return NextResponse.json(
      { error: "Нельзя удалить задачу в процессе выполнения" },
      { status: 400 }
    );
  }

  await prisma.task.update({
    where: { id: params.id },
    data: { status: "CANCELLED" },
  });

  return NextResponse.json({ success: true });
}
