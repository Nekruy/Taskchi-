import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";

const ResendSchema = z.object({
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email } = ResendSchema.parse(body);

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, name: true, isEmailVerified: true, emailVerifyExpiry: true },
    });

    if (!user) {
      // Return success to avoid user enumeration
      return NextResponse.json({ success: true });
    }

    if (user.isEmailVerified) {
      return NextResponse.json({ error: "Email уже подтверждён" }, { status: 400 });
    }

    // Rate-limit: only resend if previous code is older than 60 seconds
    if (user.emailVerifyExpiry) {
      const sentAt = new Date(user.emailVerifyExpiry.getTime() - 24 * 60 * 60 * 1000);
      if (Date.now() - sentAt.getTime() < 60_000) {
        return NextResponse.json({ error: "Подождите перед повторной отправкой" }, { status: 429 });
      }
    }

    const newCode = String(Math.floor(100000 + Math.random() * 900000));
    const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerifyToken: newCode, emailVerifyExpiry: newExpiry },
    });

    await sendVerificationEmail(email.toLowerCase(), user.name, newCode);

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "Неверный формат email" }, { status: 400 });
    }
    console.error("[ResendVerification]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
