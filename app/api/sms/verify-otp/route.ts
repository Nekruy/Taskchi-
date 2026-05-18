import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { verifyOTP } from "@/lib/otp";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone, code } = await req.json();
  if (!phone || !code) {
    return NextResponse.json({ error: "Укажите телефон и код" }, { status: 400 });
  }

  const normalized = phone.replace(/\D/g, "");
  const valid = await verifyOTP(normalized, code);

  if (!valid) {
    return NextResponse.json({ error: "Неверный или просроченный код" }, { status: 400 });
  }

  // Save verified phone to user profile if not already set
  await prisma.user.update({
    where: { id: session.user.id },
    data: { phone: `+${normalized}` },
  });

  return NextResponse.json({ ok: true });
}
