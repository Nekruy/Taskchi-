"use client";

import { useState, useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";
import Link from "next/link";
import Image from "next/image";

interface Message {
  id: string;
  content: string;
  imageUrl?: string | null;
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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

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

  async function sendMessage(content: string, imageUrl?: string) {
    setSending(true);
    try {
      const res = await fetch(`/api/chat/${chat.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, imageUrl }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, data.message]);
        socketRef.current?.emit("send-message", {
          chatId: chat.id,
          messageId: data.message.id,
          senderId: currentUserId,
          senderName: data.message.sender.name,
          senderAvatar: data.message.sender.avatar,
          content,
          imageUrl,
          createdAt: data.message.createdAt,
        });
        socketRef.current?.emit("stop-typing", { chatId: chat.id, userId: currentUserId });
      }
    } finally {
      setSending(false);
    }
  }

  async function handleSend() {
    if (!input.trim() || sending) return;
    const content = input.trim();
    setInput("");
    await sendMessage(content);
  }

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append("photo", file);
      const res = await fetch("/api/upload/chat-photo", { method: "POST", body: fd });
      if (res.ok) {
        const { url } = await res.json();
        await sendMessage("", url);
      }
    } finally {
      setUploadingPhoto(false);
      // Reset input so same file can be selected again
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <>
      {/* Lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-4"
          onClick={() => setLightboxSrc(null)}
        >
          <img src={lightboxSrc} alt="Фото" className="max-w-full max-h-full rounded-xl object-contain" />
          <button
            className="absolute top-4 right-4 text-white text-3xl font-bold"
            onClick={() => setLightboxSrc(null)}
          >×</button>
        </div>
      )}

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
                <div className={`${isOwn ? "message-bubble-own" : "message-bubble-other"} max-w-[70%]`}>
                  {/* Image */}
                  {msg.imageUrl && (
                    <button
                      onClick={() => setLightboxSrc(msg.imageUrl!)}
                      className="block mb-2 rounded-xl overflow-hidden"
                    >
                      <img
                        src={msg.imageUrl}
                        alt="Фото"
                        className="max-w-[240px] max-h-[240px] object-cover rounded-xl hover:opacity-90 transition-opacity"
                      />
                    </button>
                  )}
                  {/* Text */}
                  {msg.content && (
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                  )}
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
          {/* Photo upload button */}
          <input
            ref={photoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoUpload}
          />
          <button
            onClick={() => photoInputRef.current?.click()}
            disabled={uploadingPhoto || sending}
            className="w-10 h-10 shrink-0 rounded-xl border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 hover:text-[#14A800] transition-colors disabled:opacity-50"
            title="Прикрепить фото"
          >
            {uploadingPhoto ? (
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          <textarea
            value={input}
            onChange={(e) => { setInput(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Напишите сообщение... (Enter — отправить)"
            className="input-field flex-1 resize-none h-12 py-3"
            rows={1}
            disabled={sending || uploadingPhoto}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="btn-primary px-5 py-3"
          >
            {sending ? "..." : "→"}
          </button>
        </div>
      </div>
    </>
  );
}
