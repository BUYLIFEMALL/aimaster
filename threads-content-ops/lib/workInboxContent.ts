// U10(2026-11-06): Threads 글 한 건 → 업무 워크스페이스 「받은 업무」 내용(제목·본문 마크다운·캘린더용 구조 데이터).
// 순수 함수 — tests/work-inbox-content.test.cjs. 구조 데이터 키는 루트 docs/WORK_INBOX.md §5 규격과 같아야 한다.

export interface ThreadsPostForInbox {
  id: string;
  body: string | null;
  status: string;
  scheduled_at: string | null;
  published_at: string | null;
  permalink: string | null;
  created_at: string;
}

/** ISO 시각 → 한국 시간 날짜(YYYY-MM-DD) */
export function kstDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + 9 * 3_600_000).toISOString().slice(0, 10) : null;
}

const STATUS_LABEL: Record<string, string> = { draft: "초안", scheduled: "예약됨", publishing: "발행 중", published: "발행 완료", failed: "실패", cancelled: "취소" };

export function threadsPostInboxContent(post: ThreadsPostForInbox): { title: string; bodyMd: string; data: Record<string, string> } {
  const body = (post.body ?? "").trim();
  const firstLine = body.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const title = (firstLine.slice(0, 60) || "제목 없는 글").slice(0, 200);

  const published = kstDate(post.published_at);
  const scheduled = kstDate(post.scheduled_at);
  const meta: string[] = [`- 상태: ${STATUS_LABEL[post.status] ?? post.status}`];
  if (scheduled) meta.push(`- 예약일: ${scheduled}`);
  if (published) meta.push(`- 발행일: ${published}`);
  if (post.permalink) meta.push(`- 발행 주소: ${post.permalink}`);
  const bodyMd = [body || "(본문 없음)", "---", "## 발행 정보", meta.join("\n")].join("\n\n");

  const data: Record<string, string> = { 채널: "Threads", 상태: post.status };
  if (scheduled) data["예약일"] = scheduled;
  if (published) data["발행일"] = published;
  if (post.permalink) data["발행 주소"] = post.permalink;
  return { title, bodyMd, data };
}
