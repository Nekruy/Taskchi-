import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [user, verification] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isVerified: true, isChildVerified: true },
    }),
    prisma.verification.findUnique({
      where: { userId: session.user.id },
    }),
  ]);

  return NextResponse.json({
    isVerified: user?.isVerified ?? false,
    isChildVerified: user?.isChildVerified ?? false,
    verification,
  });
}
