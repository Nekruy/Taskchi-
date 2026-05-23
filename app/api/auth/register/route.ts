import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

const RegisterSchema = z.object({
  name: z.string().min(2, "Имя слишком короткое").max(50),
  email: z.string().email("Неверный формат email"),
  password: z.string().min(6, "Пароль минимум 6 символов"),
  phone: z.string().min(9, "Введите номер телефона"),
  city: z.string().optional(),
  role: z.enum(["CUSTOMER", "EXECUTOR"]).default("CUSTOMER"),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = RegisterSchema.parse(body);

    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже существует" },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(data.password, 12);

    await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        phone: data.phone,
        city: data.city || "Душанбе",
        role: data.role,
        isEmailVerified: true,
        emailVerified: new Date(),
      },
    });

    return NextResponse.json({ success: true, role: data.role }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }

    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      console.error("[Register] Prisma known error", err.code, err.message, err.meta);
      // P2002 = unique constraint (race condition on email)
      if (err.code === "P2002") {
        return NextResponse.json(
          { error: "Пользователь с таким email уже существует" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: `Ошибка БД: ${err.code}` },
        { status: 500 }
      );
    }

    if (err instanceof Prisma.PrismaClientInitializationError) {
      console.error("[Register] Prisma init error", err.errorCode, err.message);
      return NextResponse.json({ error: "Ошибка подключения к БД" }, { status: 500 });
    }

    if (err instanceof Prisma.PrismaClientUnknownRequestError) {
      console.error("[Register] Prisma unknown error", err.message);
    }

    console.error("[Register] Unexpected error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
