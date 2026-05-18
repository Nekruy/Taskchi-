import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  const selfieFile = formData.get("selfiePhoto") as File | null;
  const type = (formData.get("type") as string) || "BASIC";

  if (!passportFile || !selfieFile) {
    return NextResponse.json({ error: "Загрузите оба фото" }, { status: 400 });
  }

  const [passportUrl, selfieUrl] = await Promise.all([
    uploadToCloudinary(passportFile, "taskchi/verifications"),
    uploadToCloudinary(selfieFile, "taskchi/verifications"),
  ]);

  const existing = await prisma.verification.findUnique({
    where: { userId: session.user.id },
  });

  if (existing) {
    await prisma.verification.update({
      where: { userId: session.user.id },
      data: {
        passportPhoto: passportUrl ?? existing.passportPhoto,
        selfiePhoto: selfieUrl ?? existing.selfiePhoto,
        status: "PENDING",
        type: type as "BASIC" | "CHILDREN",
        adminNote: null,
        reviewedBy: null,
        reviewedAt: null,
      },
    });
  } else {
    await prisma.verification.create({
      data: {
        userId: session.user.id,
        passportPhoto: passportUrl,
        selfiePhoto: selfieUrl,
        status: "PENDING",
        type: type as "BASIC" | "CHILDREN",
      },
    });
  }

  return NextResponse.json({ ok: true });
}
