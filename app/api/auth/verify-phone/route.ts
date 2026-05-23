import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  phone: z.string(),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const { phone, code } = Schema.parse(await req.json());

    const otp = await prisma.otpCode.findFirst({
      where: {
        phone,
        code,
        used: false,
        expiresAt: { gt: new Date() },
      },
    });

    if (!otp) {
      return NextResponse.json({ error: "Неверный или просроченный код" }, { status: 400 });
    }

    await prisma.otpCode.update({ where: { id: otp.id }, data: { used: true } });

    await prisma.user.updateMany({
      where: { phone },
      data: { isEmailVerified: true, emailVerified: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[verify-phone]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
