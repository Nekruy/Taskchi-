import { prisma } from "@/lib/prisma";

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function saveOTP(phone: string, code: string): Promise<void> {
  await prisma.otpCode.updateMany({
    where: { phone, used: false },
    data: { used: true },
  });

  await prisma.otpCode.create({
    data: {
      phone,
      code,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    },
  });
}

export async function verifyOTP(phone: string, code: string): Promise<boolean> {
  const otp = await prisma.otpCode.findFirst({
    where: {
      phone,
      code,
      used: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!otp) return false;

  await prisma.otpCode.update({
    where: { id: otp.id },
    data: { used: true },
  });

  return true;
}
