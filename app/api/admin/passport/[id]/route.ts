import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendTelegramMessage } from "@/lib/telegram";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { action, adminNote } = await req.json() as {
    action: "approve" | "reject";
    adminNote?: string;
  };

  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

  const user = await prisma.user.update({
    where: { id: params.id },
    data: {
      passportStatus: newStatus,
      passportNote: adminNote ?? null,
    },
    select: { name: true, telegramId: true },
  });

  if (user.telegramId) {
    const msg =
      action === "approve"
        ? `✅ <b>Паспорт верифицирован!</b>\n\nВаш аккаунт исполнителя на Taskchi подтверждён. Теперь вы можете откликаться на задачи.`
        : `❌ <b>Верификация отклонена</b>\n\nПричина: ${adminNote || "не указана"}\n\nЗагрузите корректное фото паспорта и попробуйте снова.`;
    await sendTelegramMessage(user.telegramId, msg);
  }

  return NextResponse.json({ success: true });
}
