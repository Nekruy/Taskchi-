"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Рендер markdown-контента уроков. Сырой HTML не разрешён (react-markdown по умолчанию его не рендерит). */
export function Markdown({ content, className = "" }: { content: string; className?: string }) {
  return (
    <div
      className={`prose prose-sm sm:prose-base max-w-none prose-headings:text-gray-900 prose-headings:font-extrabold prose-a:text-[#14A800] prose-strong:text-gray-900 prose-blockquote:border-[#14A800] prose-blockquote:text-gray-600 prose-li:marker:text-[#14A800] ${className}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
        {content}
      </ReactMarkdown>
    </div>
  );
}
