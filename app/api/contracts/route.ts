import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { generateContractText } from "@/lib/groq";
import { generateContractPDF } from "@/lib/pdf";
import path from "path";
import fs from "fs/promises";

// POST /api/contracts — генерация договора
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Необходима авторизация" }, { status: 401 });
  }

  try {
    const { taskId } = await req.json();

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        creator: { select: { id: true, name: true } },
        executor: { select: { id: true, name: true } },
        escrow: { select: { amount: true } },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Задача не найдена" }, { status: 404 });
    }

    if (task.creatorId !== session.user.id) {
      return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
    }

    if (!task.executor) {
      return NextResponse.json(
        { error: "Сначала выберите исполнителя" },
        { status: 400 }
      );
    }

    // Check if contract already exists
    const existingContract = await prisma.contract.findUnique({
      where: { taskId },
    });

    if (existingContract) {
      return NextResponse.json({ contract: existingContract });
    }

    const amount = task.escrow?.amount || task.budget;

    // Generate contract text via Groq
    const contractText = await generateContractText({
      taskTitle: task.title,
      taskDescription: task.description,
      customerName: task.creator.name,
      executorName: task.executor.name,
      amount,
      deadline: task.deadline?.toISOString(),
      city: task.city,
    });

    // Create contract record
    const contract = await prisma.contract.create({
      data: {
        taskId,
        customerId: task.creatorId,
        executorId: task.executorId!,
        content: contractText,
        status: "DRAFT",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Generate PDF
    try {
      const pdfBuffer = await generateContractPDF(contractText, {
        taskTitle: task.title,
        customerName: task.creator.name,
        executorName: task.executor.name,
        amount,
        contractId: contract.id,
      });

      const uploadsDir = path.join(process.cwd(), "public", "contracts");
      await fs.mkdir(uploadsDir, { recursive: true });

      const filename = `contract-${contract.id}.pdf`;
      await fs.writeFile(path.join(uploadsDir, filename), pdfBuffer);

      const pdfUrl = `/contracts/${filename}`;
      await prisma.contract.update({
        where: { id: contract.id },
        data: { pdfUrl },
      });

      return NextResponse.json({ contract: { ...contract, pdfUrl } }, { status: 201 });
    } catch (pdfErr) {
      console.error("[PDF Generation]", pdfErr);
      return NextResponse.json({ contract }, { status: 201 });
    }
  } catch (err) {
    console.error("[Contracts POST]", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
