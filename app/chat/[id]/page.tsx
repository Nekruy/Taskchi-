import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ChatClient } from "./ChatClient";

export const metadata = { title: "Чат" };

export default async function ChatPage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const chat = await prisma.chat.findUnique({
    where: { id: params.id },
    include: {
      task: {
        select: {
          id: true, title: true, status: true, budget: true,
          escrow: { select: { status: true, amount: true } },
        },
      },
      customer: { select: { id: true, name: true, avatar: true } },
      executor: { select: { id: true, name: true, avatar: true } },
      messages: {
        include: {
          sender: { select: { id: true, name: true, avatar: true } },
        },
        orderBy: { createdAt: "asc" },
        take: 50,
      },
    },
  });

  if (!chat) notFound();

  if (chat.customerId !== session.user.id && chat.executorId !== session.user.id) {
    redirect("/dashboard");
  }

  return <ChatClient chat={chat as never} currentUserId={session.user.id} />;
}
