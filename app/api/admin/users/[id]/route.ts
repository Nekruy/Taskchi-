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
  const { action } = body;

  let data: Record<string, boolean> = {};

  if (action === "ban") {
    data = { isBanned: true };
  } else if (action === "unban") {
    data = { isBanned: false };
  } else if (action === "verify") {
    data = { isVerified: true };
  } else if (action === "unverify") {
    data = { isVerified: false };
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data,
    select: { id: true, isBanned: true, isVerified: true },
  });

  return NextResponse.json(user);
}
