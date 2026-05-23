import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";
import crypto from "crypto";

async function uploadToCloudinary(file: File, folder: string): Promise<string | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;

  const timestamp = Math.round(Date.now() / 1000).toString();
  const signature = crypto
    .createHash("sha1")
    .update(`folder=${folder}&timestamp=${timestamp}${apiSecret}`)
    .digest("hex");

  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);
  fd.append("timestamp", timestamp);
  fd.append("api_key", apiKey);
  fd.append("signature", signature);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: "POST", body: fd }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return (data.secure_url as string) ?? null;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const passportFile = formData.get("passportPhoto") as File | null;
  const selfieFile   = formData.get("selfiePhoto")   as File | null;

  if (!passportFile || !selfieFile) {
    return NextResponse.json({ error: "Загрузите оба фото" }, { status: 400 });
  }

  const [passportUrl, selfieUrl] = await Promise.all([
    uploadToCloudinary(passportFile, "passports"),
    uploadToCloudinary(selfieFile,   "passports"),
  ]);

  if (!passportUrl || !selfieUrl) {
    return NextResponse.json({ error: "Ошибка загрузки фото" }, { status: 500 });
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { passportPhoto: passportUrl, selfiePhoto: selfieUrl, passportStatus: "PENDING" },
    select: { name: true, email: true },
  });

  const adminChatId = process.env.TELEGRAM_ADMIN_CHAT_ID;
  if (adminChatId) {
    await sendTelegramMessage(
      adminChatId,
      `🆔 <b>Новая верификация паспорта!</b>\n\nИсполнитель: ${user.name}\nEmail: ${user.email}\n\nПроверьте: /admin/verification`
    );
  }

  return NextResponse.json({ success: true });
}
