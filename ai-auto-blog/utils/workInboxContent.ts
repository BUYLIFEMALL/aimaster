// U10 2차(2026-11-07): 글 한 건 → 업무 워크스페이스 「받은 업무」 내용(제목·본문 마크다운·캘린더용 구조 데이터).
// 순수 함수(DB·서버 없음) — tests/work-inbox-content.test.cjs. 구조 데이터 키는 루트 docs/WORK_INBOX.md §5 규격과 같아야 한다.
// 이 프로그램은 네이버 발행 버튼을 회원이 직접 누르므로 「발행 완료」로 보내지 않는다(발행 주소도 없음).
// 날짜는 네이버 입력을 마친 날(없으면 글을 만든 날)을 「예약일」로 보낸다 — 캘린더에서 회원이 발행 뒤 상태를 고친다.

export interface BlogPostForInbox {
  id: number;
  title: string | null;
  excerpt: string | null;
  content: string | null;
  published_at: string | null;
  created_at?: string | null;
  naver_input_status: string | null;
  naver_input_completed_at: string | null;
}

/** ISO 시각 → 한국 시간 날짜(YYYY-MM-DD). 서버(UTC) 날짜를 그대로 쓰면 밤 9시 이후 하루 전 날짜가 된다. */
export function kstDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + 9 * 3_600_000).toISOString().slice(0, 10) : null;
}

const NAVER_LABEL: Record<string, string> = {
  in_progress: "네이버 입력 중",
  completed: "네이버 입력 완료(발행은 직접)",
  publish_ready: "네이버 발행 직전 준비 완료(발행은 직접)",
  failed: "네이버 입력 실패",
};

const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'" };

/** 글 본문 HTML → 읽기 쉬운 마크다운 글(소제목·목록·문단만, 이미지·스크립트·하단 이미지 프롬프트 구역 제외) */
export function blogHtmlToMarkdown(html: string): string {
  let s = html ?? "";
  const promptIdx = s.search(/🎨\s*생성\s*이미지/);
  if (promptIdx !== -1) s = s.slice(0, Math.max(0, s.lastIndexOf("<h", promptIdx)));
  s = s
    .replace(/<(script|style|figcaption)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<img[^>]*>/gi, "")
    .replace(/<h[1-6][^>]*>([\s\S]*?)<\/h[1-6]>/gi, (_m, t: string) => `\n\n## ${t.replace(/<[^>]+>/g, "").trim()}\n\n`)
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|ul|ol|blockquote)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m] ?? m);
  return s
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 50_000);
}

export function blogPostInboxContent(post: BlogPostForInbox): { title: string; bodyMd: string; data: Record<string, string> } {
  const title = ((post.title ?? "").trim() || "제목 없는 글").slice(0, 200);
  const status = post.naver_input_status ?? "";
  const day = kstDate(post.naver_input_completed_at) ?? kstDate(post.published_at) ?? kstDate(post.created_at);

  const excerpt = (post.excerpt ?? "").replace(/\s+/g, " ").trim();
  const meta = [`- 네이버 입력: ${NAVER_LABEL[status] ?? "아직 보내지 않음"}`];
  const written = kstDate(post.published_at);
  if (written) meta.push(`- 작성일: ${written}`);
  if (kstDate(post.naver_input_completed_at)) meta.push(`- 네이버 입력일: ${kstDate(post.naver_input_completed_at)}`);
  const body = blogHtmlToMarkdown(post.content ?? "");
  const bodyMd = [excerpt, body || "(본문 없음)", "---", "## 발행 정보", meta.join("\n")].filter(Boolean).join("\n\n");

  const data: Record<string, string> = { 채널: "네이버 블로그", 상태: status === "failed" ? "failed" : "draft" };
  if (day) data["예약일"] = day;
  return { title, bodyMd, data };
}
