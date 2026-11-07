// U10 2차(2026-11-07): 원고 한 건(nba_posts) → 업무 워크스페이스 「받은 업무」 내용(제목·본문 마크다운·캘린더용 구조 데이터).
// 순수 함수(가져오기 없음) — scripts/test-work-inbox-content.cjs. 구조 데이터 키는 루트 docs/WORK_INBOX.md §5 규격과 같아야 한다.

export interface NbaPostForInbox {
  id: string;
  title: string | null;
  content: string | null;
  tags: string[] | null;
  category_name: string | null;
  status: string;
  is_reserved?: boolean | null;
  scheduled_at: string | null;
  published_at: string | null;
  post_url: string | null;
}

/** ISO 시각 → 한국 시간 날짜(YYYY-MM-DD). 서버(UTC) 날짜를 그대로 쓰면 밤 9시 이후 하루 전 날짜가 된다. */
export function kstDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + 9 * 3_600_000).toISOString().slice(0, 10) : null;
}

const STATUS_LABEL: Record<string, string> = { draft: "초안", queued: "발행 대기", publishing: "발행 중", published: "발행 완료", failed: "실패" };

/** 원고 본문 → 마크다운: [SECTION - 소제목]은 ## 소제목, [IMAGE INSERT - n] 표시는 뺀다 */
export function nbaContentToMarkdown(content: string): string {
  return String(content ?? "")
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim();
      const section = /^\[SECTION\s*-\s*(.+)\]$/i.exec(t);
      if (section) return `## ${section[1].trim()}`;
      if (/^\[IMAGE INSERT\s*-\s*\d+\]$/i.test(t)) return null;
      return line.replace(/\s+$/, "");
    })
    .filter((line): line is string => line !== null)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 100_000);
}

export function nbaPostInboxContent(post: NbaPostForInbox): { title: string; bodyMd: string; data: Record<string, string> } {
  const title = ((post.title ?? "").trim() || "제목 없는 원고").slice(0, 200);
  const published = post.status === "published" ? kstDate(post.published_at) : null;
  const scheduled = !published && (post.status === "queued" || post.is_reserved) ? kstDate(post.scheduled_at) : null;

  const meta = [`- 상태: ${STATUS_LABEL[post.status] ?? post.status}`];
  if (post.category_name) meta.push(`- 카테고리: ${post.category_name}`);
  if (scheduled) meta.push(`- 예약일: ${scheduled}`);
  if (published) meta.push(`- 발행일: ${published}`);
  if (post.post_url) meta.push(`- 발행 주소: ${post.post_url}`);
  const tags = (post.tags ?? []).filter(Boolean).map((t) => `#${t.replace(/^#/, "")}`).join(" ");
  const body = nbaContentToMarkdown(post.content ?? "");
  const bodyMd = [body || "(본문 없음)", tags, "---", "## 발행 정보", meta.join("\n")].filter(Boolean).join("\n\n");

  const data: Record<string, string> = { 채널: "네이버 블로그", 상태: post.status };
  if (scheduled) data["예약일"] = scheduled;
  if (published) data["발행일"] = published;
  if (post.post_url) data["발행 주소"] = post.post_url;
  return { title, bodyMd, data };
}
