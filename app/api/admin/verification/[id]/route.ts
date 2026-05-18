import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action, adminNote } = await req.json();
  if (action !== "approve" && action !== "reject") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const verification = await prisma.verification.findUnique({
    where: { id: params.id },
  });
  if (!verification) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

  await prisma.verification.update({
    where: { id: params.id },
    data: {
      status: newStatus,
      adminNote: adminNote || null,
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
    },
  });

  if (action === "approve") {
    const updateData: Record<string, boolean> = { isVerified: true };
    if (verification.type === "CHILDREN") updateData.isChildVerified = true;

    await prisma.user.update({
      where: { id: verification.userId },
      data: updateData,
    });
  } else {
    await prisma.user.update({
      where: { id: verification.userId },
      data: { isVerified: false, isChildVerified: false },
    });
  }

  return NextResponse.json({ ok: true });
}
