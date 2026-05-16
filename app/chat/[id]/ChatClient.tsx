"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import Link from "next/link";

interface Message {
  id: string;
  content: string;
  senderId: string;
  createdAt: string | Date;
  sender: { id: string; name: string; avatar?: string | null };
}

interface ChatClientProps {
  chat: {
    id: string;
    task: {
      id: string;
      title: string;
      status: string;
      budget: number;
      escrow?: { status: string; amount: number } | null;
    };
    customer: { id: string; name: string; avatar?: string | null };
    executor: { id: string; name: string; avatar?: string | null };
    messages: Message[];
  };
  currentUserId: string;
}

export function ChatClient({ chat, currentUserId }: ChatClientProps) {
  const [messages, setMessages] = useState<Message[]>(chat.messages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [typing, setTyping] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const partner =
    chat.customer.id === currentUserId ? chat.executor : chat.customer;

  useEffect(() => {
    const socket = io(window.location.origin, { path: "/socket.io" });
    socketRef.current = socket;

    socket.emit("join-chat", chat.id);

    socket.on("new-message", (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on("user-typing", ({ userName }: { userName: string }) => {
      setTyping(userName);
    });

    socket.on("user-stop-typing", () => {
      setTyping(null);
    });

    return () => {
      socket.emit("leave-chat", chat.id);
      socket.disconnect();
    };
  }, [chat.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleTyping() {
    socketRef.current?.emit("typing", {
      chatId: chat.id,
      userId: currentUserId,
      userName: partner.name,
    });

    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      socketRef.current?.emit("stop-typing", {
        chatId: chat.id,
        userId: currentUserId,
      });
    }, 2000);
  }

  async function sendMessage() {
    if (!input.trim() || sending) return;
    setSending(true);

    const content = input.trim();
    setInput("");

    try {
      const res = await fetch(`/api/chat/${chat.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);

        // Emit via socket for real-time delivery
        socketRef.current?.emit("send-message", {
          chatId: chat.id,
          messageId: data.message.id,
          senderId: currentUserId,
          senderName: data.message.sender.name,
          senderAvatar: data.message.sender.avatar,
          content,
          createdAt: data.message.createdAt,
        });

        socketRef.current?.emit("stop-typing", { chatId: chat.id, userId: currentUserId });
      }
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      {/* Header */}
      <div className="card mb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-[#14A800] font-bold">
              {partner.name[0]}
            </div>
            <div>
              <Link href={`/profile/${partner.id}`} className="font-semibold text-slate-800 hover:text-[#14A800]">
                {partner.name}
              </Link>
              <div className="text-xs text-slate-500 truncate max-w-[200px]">
                📋 {chat.task.title}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {chat.task.escrow && (
              <span className={`badge ${chat.task.escrow.status === "HELD" ? "bg-blue-100 text-blue-700" : chat.task.escrow.status === "RELEASED" ? "badge-open" : "badge-cancelled"}`}>
                {chat.task.escrow.status === "HELD" ? "🔒" : "✅"} {chat.task.escrow.amount} сом
              </span>
            )}
            <Link href={`/tasks/${chat.task.id}`} className="btn-secondary text-xs py-1.5 px-3">
              К задаче →
            </Link>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-3 pb-3 scrollbar-hide">
        {messages.length === 0 && (
          <div className="text-center text-slate-400 text-sm py-10">
            Начните переписку 👋
          </div>
        )}

        {messages.map((msg) => {
          const isOwn = msg.senderId === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"} gap-2`}>
              {!isOwn && (
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-xs font-bold shrink-0 mt-auto">
                  {msg.sender.name[0]}
                </div>
              )}
              <div className={isOwn ? "message-bubble-own" : "message-bubble-other"}>
                <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                <p className={`text-xs mt-1 ${isOwn ? "text-green-200" : "text-slate-400"}`}>
                  {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          );
        })}

        {typing && (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            {typing} печатает...
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex-shrink-0 flex gap-2 pt-3 border-t border-slate-100">
        <textarea
          value={input}
          onChange={(e) => { setInput(e.target.value); handleTyping(); }}
          onKeyDown={handleKeyDown}
          placeholder="Напишите сообщение... (Enter — отправить)"
          className="input-field flex-1 resize-none h-12 py-3"
          rows={1}
          disabled={sending}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || sending}
          className="btn-primary px-5 py-3"
        >
          {sending ? "..." : "→"}
        </button>
      </div>
    </div>
  );
}
