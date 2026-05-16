import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { action, resolution } = body;

  if (action === "resolve_customer") {
    // Get dispute to find the task
    const dispute = await prisma.dispute.findUnique({
      where: { id: params.id },
      select: { taskId: true },
    });

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    const [updatedDispute] = await prisma.$transaction([
      prisma.dispute.update({
        where: { id: params.id },
        data: {
          status: "RESOLVED_CUSTOMER",
          resolution: resolution ?? null,
          resolvedById: session.user.id,
        },
      }),
      prisma.escrow.updateMany({
        where: { taskId: dispute.taskId },
        data: { status: "REFUNDED", refundedAt: new Date() },
      }),
    ]);

    return NextResponse.json(updatedDispute);
  }

  if (action === "resolve_executor") {
    const dispute = await prisma.dispute.findUnique({
      where: { id: params.id },
      select: { taskId: true },
    });

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    const [updatedDispute] = await prisma.$transaction([
      prisma.dispute.update({
        where: { id: params.id },
        data: {
          status: "RESOLVED_EXECUTOR",
          resolution: resolution ?? null,
          resolvedById: session.user.id,
        },
      }),
      prisma.escrow.updateMany({
        where: { taskId: dispute.taskId },
        data: { status: "RELEASED", releasedAt: new Date() },
      }),
    ]);

    return NextResponse.json(updatedDispute);
  }

  if (action === "close") {
    const updatedDispute = await prisma.dispute.update({
      where: { id: params.id },
      data: {
        status: "CLOSED",
        resolvedById: session.user.id,
      },
    });

    return NextResponse.json(updatedDispute);
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
