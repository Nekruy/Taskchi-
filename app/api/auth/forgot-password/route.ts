import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Введите email" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    // Всегда возвращаем 200 — не раскрываем, зарегистрирован ли email
    if (!user) {
      return NextResponse.json({ ok: true });
    }

    // Инвалидируем старые токены
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 час

    await prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    await sendPasswordResetEmail(user.email, token);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[forgot-password]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
