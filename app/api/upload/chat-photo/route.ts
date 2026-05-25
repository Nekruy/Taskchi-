import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import crypto from "crypto";

async function uploadToCloudinary(file: File, folder: string): Promise<string | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey    = process.env.CLOUDINARY_API_KEY;
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

// POST /api/upload/chat-photo
export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("photo") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Файл не выбран" }, { status: 400 });
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: "Файл слишком большой (макс. 10 МБ)" }, { status: 400 });
  }

  const url = await uploadToCloudinary(file, "chat-photos");
  if (!url) {
    return NextResponse.json({ error: "Ошибка загрузки фото" }, { status: 500 });
  }

  return NextResponse.json({ url });
}
