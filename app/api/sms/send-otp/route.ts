import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateOTP, saveOTP } from "@/lib/otp";
import { sendSMS } from "@/lib/sms";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { phone } = await req.json();
  if (!phone || typeof phone !== "string") {
    return NextResponse.json({ error: "Укажите номер телефона" }, { status: 400 });
  }

  const normalized = phone.replace(/\D/g, "");
  if (normalized.length < 9 || normalized.length > 15) {
    return NextResponse.json({ error: "Неверный формат номера" }, { status: 400 });
  }

  const code = generateOTP();
  await saveOTP(normalized, code);

  if (process.env.ESKIZ_EMAIL && process.env.ESKIZ_PASSWORD) {
    await sendSMS(normalized, `Taskchi: ваш код верификации ${code}. Действителен 10 минут.`);
  }

  return NextResponse.json({ ok: true });
}
