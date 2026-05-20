import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const VerifySchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, code } = VerifySchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, isEmailVerified: true, emailVerifyToken: true, emailVerifyExpiry: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден" }, { status: 404 });
    }

    if (user.isEmailVerified) {
      return NextResponse.json({ success: true, alreadyVerified: true });
    }

    if (!user.emailVerifyToken || user.emailVerifyToken !== code) {
      return NextResponse.json({ error: "Неверный код подтверждения" }, { status: 400 });
    }

    if (!user.emailVerifyExpiry || user.emailVerifyExpiry < new Date()) {
      return NextResponse.json({ error: "Код устарел. Запросите новый" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        isEmailVerified: true,
        emailVerifyToken: null,
        emailVerifyExpiry: null,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверный формат данных" }, { status: 400 });
    }
    console.error("[VerifyEmail]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
