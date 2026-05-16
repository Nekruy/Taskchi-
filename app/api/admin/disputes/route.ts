import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const disputes = await prisma.dispute.findMany({
    include: {
      task: { select: { id: true, title: true, budget: true, status: true } },
      filedBy: { select: { id: true, name: true } },
      resolvedBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(disputes);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { taskId, reason } = body;

  if (!taskId || !reason) {
    return NextResponse.json({ error: "taskId and reason are required" }, { status: 400 });
  }

  const dispute = await prisma.dispute.create({
    data: {
      taskId,
      reason,
      filedById: session.user.id,
    },
  });

  return NextResponse.json(dispute, { status: 201 });
}
