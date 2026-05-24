import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const Schema = z.object({
  // Step 1 — Personal info
  lastName:       z.string().max(60).optional(),
  gender:         z.string().optional(),
  birthDate:      z.string().optional(),   // ISO date string, e.g. "1995-03-14"
  avatar:         z.string().url().optional(),
  // Step 2 — Profession & categories
  profession:     z.string().optional(),
  skills:         z.array(z.string()).default([]),
  // Step 3 — Education & extras
  education:      z.string().optional(),
  educationField: z.string().max(100).optional(),
  extraSkills:    z.array(z.string()).default([]),
  hasCar:         z.boolean().default(false),
  workWeekends:   z.boolean().default(false),
  // Step 4 — About
  headline:       z.string().max(120).optional(),
  about:          z.string().max(500).optional(),
  workArea:       z.string().optional(),
});

export async function POST(req: NextRequest) {
  const token = await getToken({ req });
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = Schema.parse(await req.json());

    // Always-set fields (with defaults)
    const updateData: Record<string, unknown> = {
      skills:       body.skills,
      extraSkills:  body.extraSkills,
      hasCar:       body.hasCar,
      workWeekends: body.workWeekends,
    };

    // Optional fields — only set if provided
    if (body.lastName?.trim())       updateData.lastName       = body.lastName.trim();
    if (body.gender)                 updateData.gender         = body.gender;
    if (body.birthDate)              updateData.birthDate      = new Date(body.birthDate);
    if (body.avatar)                 updateData.avatar         = body.avatar;
    if (body.profession)             updateData.profession     = body.profession;
    if (body.education)              updateData.education      = body.education;
    if (body.educationField?.trim()) updateData.educationField = body.educationField.trim();
    if (body.headline?.trim())       updateData.headline       = body.headline.trim().slice(0, 120);
    if (body.about?.trim())          updateData.about          = body.about.trim().slice(0, 500);
    if (body.workArea)               updateData.workArea       = body.workArea;

    await prisma.user.update({
      where: { id: token.id as string },
      data:  updateData,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[onboarding/executor]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
