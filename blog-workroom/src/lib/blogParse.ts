// 네이버 블로그 주소 해석(서버·화면·테스트 공용, 외부 호출 없음)
const ID = /^[A-Za-z0-9_-]{3,40}$/;
const RESERVED = new Set(["PostView.naver", "PostList.naver", "BlogHome.naver", "prologue", "ProfileView.naver"]);

/** 블로그 주소·ID → 블로그 ID. 해석할 수 없으면 null */
export function parseBlogId(input: string): string | null {
  const raw = String(input ?? "").trim();
  if (!raw) return null;
  if (ID.test(raw)) return raw;
  let url: URL;
  try { url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  if (!/(^|\.)blog\.naver\.com$/i.test(url.hostname)) return null;
  const q = url.searchParams.get("blogId");
  if (q && ID.test(q)) return q;
  const first = url.pathname.split("/").filter(Boolean)[0];
  return first && !RESERVED.has(first) && ID.test(first) ? first : null;
}

/** 블로그 글 주소 → { blogId, logNo }. 글 주소가 아니면 null */
export function parsePostRef(input: string): { blogId: string; logNo: string } | null {
  let url: URL;
  try { url = new URL(String(input ?? "").trim()); } catch { return null; }
  if (!/(^|\.)blog\.naver\.com$/i.test(url.hostname)) return null;
  const qb = url.searchParams.get("blogId"), ql = url.searchParams.get("logNo");
  if (qb && ql && ID.test(qb) && /^\d{6,20}$/.test(ql)) return { blogId: qb, logNo: ql };
  const [blogId, logNo] = url.pathname.split("/").filter(Boolean);
  return blogId && logNo && ID.test(blogId) && /^\d{6,20}$/.test(logNo) ? { blogId, logNo } : null;
}

const ENT: Record<string, string> = { quot: '"', amp: "&", lt: "<", gt: ">", apos: "'", nbsp: " ", "#39": "'" };
export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (m, e: string) => {
    if (e[0] === "#") { const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10); return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : m; }
    return ENT[e.toLowerCase()] ?? m;
  });
}
