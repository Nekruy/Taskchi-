import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";

const Schema = z.object({
  skills: z.array(z.string()).min(1, "Выберите хотя бы одну категорию"),
  workArea: z.string().min(1, "Выберите район"),
  about: z.string().max(200).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const data = Schema.parse(await req.json());

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        skills: data.skills,
        workArea: data.workArea,
        about: data.about ?? "",
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
