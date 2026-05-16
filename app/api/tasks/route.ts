import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { parseTaskFromText } from "@/lib/groq";
import { notifyNewTask } from "@/lib/telegram";
import { calculateCommission } from "@/lib/commission";

const CreateTaskSchema = z.object({
  title: z.string().min(5).max(120),
  description: z.string().min(10),
  category: z.enum(["CHILDREN", "SHOPPING", "DELIVERY", "QUEUE", "HOUSEHOLD", "ONLINE"]),
  budget: z.number().positive().max(100000),
  address: z.string().optional(),
  city: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  isGroupTask: z.boolean().optional(),
  executorsNeeded: z.number().int().min(1).max(20).optional(),
  deadline: z.string().optional(),
  rawInput: z.string().optional(),
  aiParsed: z.boolean().optional(),
});

// GET /api/tasks — список задач
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const city = searchParams.get("city");
  const status = searchParams.get("status") || "OPEN";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { status };
  if (category) where.category = category;
  if (city) where.city = { contains: city, mode: "insensitive" };

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: {
        creator: {
          select: { id: true, name: true, avatar: true, rating: true, city: true },
        },
        _count: { select: { offers: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.task.count({ where }),
  ]);

  return NextResponse.json({ tasks, total, page, pages: Math.ceil(total / limit) });
}

// POST /api/tasks — создать задачу
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  try {
    const body = await req.json();

    // AI-parsing mode
    if (body.rawInput && !body.title) {
      const parsed = await parseTaskFromText(body.rawInput);
      const commission = calculateCommission(parsed.budget);

      const task = await prisma.task.create({
        data: {
          ...parsed,
          deadline: parsed.deadline ? new Date(parsed.deadline) : undefined,
          commissionFee: commission,
          creatorId: session.user.id,
          aiParsed: true,
          rawInput: body.rawInput,
        },
        include: {
          creator: { select: { id: true, name: true, avatar: true, telegramId: true } },
        },
      });

      // Telegram notification
      await notifyNewTask({
        telegramId: task.creator.telegramId || undefined,
        taskTitle: task.title,
        taskId: task.id,
        budget: task.budget,
        city: task.city,
      });

      return NextResponse.json({ task }, { status: 201 });
    }

    const data = CreateTaskSchema.parse(body);
    const commission = calculateCommission(data.budget);

    const task = await prisma.task.create({
      data: {
        ...data,
        deadline: data.deadline ? new Date(data.deadline) : undefined,
        commissionFee: commission,
        creatorId: session.user.id,
      },
      include: {
        creator: { select: { id: true, name: true, avatar: true, telegramId: true } },
      },
    });

    await notifyNewTask({
      telegramId: task.creator.telegramId || undefined,
      taskTitle: task.title,
      taskId: task.id,
      budget: task.budget,
      city: task.city,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    console.error("[Tasks POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
