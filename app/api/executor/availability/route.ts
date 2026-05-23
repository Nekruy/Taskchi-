import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { isAvailable } = await req.json() as { isAvailable: boolean };

  await prisma.user.update({
    where: { id: token.id as string },
    data: { isAvailable },
  });

  return NextResponse.json({ success: true });
}
