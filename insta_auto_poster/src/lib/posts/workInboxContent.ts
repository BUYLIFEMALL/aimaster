// U10(2026-11-06): 게시글 한 건 → 업무 워크스페이스 「받은 업무」 내용(제목·본문 마크다운·캘린더용 구조 데이터).
// 순수 함수(DB·서버 없음) — tests/workInboxContent.test.mjs. 구조 데이터 키는 루트 docs/WORK_INBOX.md §5 규격과 같아야 한다.

export interface InstaPostForInbox {
  id: string;
  caption: string | null;
  hashtags: string[] | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  ig_permalink: string | null;
  post_type?: string | null;
  created_at: string;
}

/** ISO 시각 → 한국 시간 날짜(YYYY-MM-DD). 서버(UTC) 날짜를 그대로 쓰면 밤 9시 이후 하루 전 날짜가 된다. */
export function kstDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + 9 * 3_600_000).toISOString().slice(0, 10) : null;
}

const STATUS_LABEL: Record<string, string> = { draft: "초안", scheduled: "예약됨", publishing: "게시 중", published: "게시 완료", failed: "실패" };

export function instaPostInboxContent(post: InstaPostForInbox): { title: string; bodyMd: string; data: Record<string, string> } {
  const caption = (post.caption ?? "").trim();
  const firstLine = caption.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const prefix = post.post_type === "card_news" ? "[카드뉴스] " : "";
  const title = (prefix + (firstLine.slice(0, 60) || "제목 없는 게시글")).slice(0, 200);

  const tags = (post.hashtags ?? []).filter(Boolean).map((h) => `#${h.replace(/^#/, "")}`).join(" ");
  const published = kstDate(post.published_at);
  const scheduled = kstDate(post.scheduled_at);
  const meta: string[] = [`- 상태: ${STATUS_LABEL[post.status] ?? post.status}`];
  if (scheduled) meta.push(`- 예약일: ${scheduled}`);
  if (published) meta.push(`- 발행일: ${published}`);
  if (post.ig_permalink) meta.push(`- 발행 주소: ${post.ig_permalink}`);
  const bodyMd = [caption || "(캡션 없음)", tags, "---", "## 발행 정보", ...meta].filter((s) => s !== "").join("\n\n").replace(/\n\n(- )/g, "\n$1");

  const data: Record<string, string> = { 채널: "인스타그램", 상태: post.status };
  if (scheduled) data["예약일"] = scheduled;
  if (published) data["발행일"] = published;
  if (post.ig_permalink) data["발행 주소"] = post.ig_permalink;
  return { title, bodyMd, data };
}
