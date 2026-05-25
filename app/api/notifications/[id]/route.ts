import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

// PATCH /api/notifications/[id] — mark single notification as read
export async function PATCH(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notification = await prisma.notification.findUnique({
    where: { id: params.id },
  });

  if (!notification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (notification.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.notification.update({
    where: { id: params.id },
    data: { isRead: true },
  });

  return NextResponse.json({ success: true });
}
