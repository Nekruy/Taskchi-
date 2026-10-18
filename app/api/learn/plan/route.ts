import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/learn-session";
import { getCourseCards, schedulePlan } from "@/lib/learn";

export const dynamic = "force-dynamic";

const PlanSchema = z.object({
  daysPerWeek: z.coerce.number().int().min(1, "От 1 дня в неделю").max(7, "До 7 дней в неделю"),
  preferredDays: z.array(z.number().int().min(0).max(6)).max(7).default([]),
});

async function planResponse(userId: string) {
  const plan = await prisma.learningPlan.findUnique({ where: { userId }, select: { daysPerWeek: true, preferredDays: true, updatedAt: true } });
  if (!plan) return { plan: null, items: [] };
  const cards = await getCourseCards(userId);
  return { plan: { daysPerWeek: plan.daysPerWeek, preferredDays: plan.preferredDays, updatedAt: plan.updatedAt }, items: schedulePlan(plan, cards) };
}

// GET /api/learn/plan
export async function GET() {
  const { userId, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    return NextResponse.json(await planResponse(userId));
  } catch (err) {
    console.error("[Learn plan GET]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}

// PUT /api/learn/plan — создать/обновить план
export async function PUT(req: NextRequest) {
  const { userId, unauthorized } = await requireUser();
  if (unauthorized) return unauthorized;
  try {
    const data = PlanSchema.parse(await req.json());
    const preferredDays = Array.from(new Set(data.preferredDays)).sort();
    await prisma.learningPlan.upsert({
      where: { userId },
      update: { daysPerWeek: data.daysPerWeek, preferredDays },
      create: { userId, daysPerWeek: data.daysPerWeek, preferredDays },
    });
    return NextResponse.json(await planResponse(userId));
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    console.error("[Learn plan PUT]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
