import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status") || "";

  const verifications = await prisma.verification.findMany({
    where: status ? { status: status as never } : undefined,
    include: {
      user: { select: { id: true, name: true, phone: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ verifications });
}
