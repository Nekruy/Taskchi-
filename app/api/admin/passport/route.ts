import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const status = req.nextUrl.searchParams.get("status") || undefined;

  const users = await prisma.user.findMany({
    where: {
      role: "EXECUTOR",
      ...(status ? { passportStatus: status } : { passportStatus: { not: "NONE" } }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      passportPhoto: true,
      passportStatus: true,
      passportNote: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ users });
}
