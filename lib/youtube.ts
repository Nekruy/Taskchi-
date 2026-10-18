// Клиент-безопасный хелпер (без prisma) — используется и в админ-формах, и на странице урока.

/**
 * Достаёт id ролика из ссылок youtube.com/watch?v=, youtu.be/, /embed/, /shorts/.
 * Возвращает null для не-YouTube ссылок.
 */
export function extractYoutubeId(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = u.pathname.slice(1).split("/")[0] || null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = u.pathname.match(/^\/(?:embed|shorts|v|live)\/([^/?]+)/);
      id = m ? m[1] : null;
    }
  }
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  return id;
}
