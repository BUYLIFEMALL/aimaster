// U10 유튜브(2026-11-12, 업무 워크스페이스 담당 작성 — 영상 담당 답 shots/docs/IMPROVEMENTS.md 맨 위):
// 유튜브에 올린 기록 한 건 → 업무 워크스페이스 「받은 업무」 내용(제목·본문·콘텐츠 캘린더용 구조 데이터).
// 순수 함수(DB·서버 없음) — tests/youtubeInboxContent.test.mjs. 데이터 키는 루트 docs/WORK_INBOX.md §5 규격.

export interface YoutubeUploadRecord {
  videoId: string;
  url: string;
  privacy?: string | null;
  publishAt?: string | null;
  at?: string | null;
}

/** ISO 시각 → 한국 시간 날짜(YYYY-MM-DD) */
export function kstDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + 9 * 3_600_000).toISOString().slice(0, 10) : null;
}

const PRIVACY_LABEL: Record<string, string> = { private: "비공개", unlisted: "일부 공개", public: "공개" };

/** 예약 시각이 미래면 예약, 그 밖에는 발행(올린 기록은 성공한 것만 남는다) */
export function youtubeUploadInboxContent(
  title: string | null | undefined,
  u: YoutubeUploadRecord,
  now = Date.now(),
): { title: string; bodyMd: string; data: Record<string, string> } {
  const scheduledFuture = !!u.publishAt && Date.parse(u.publishAt) > now;
  const status = scheduledFuture ? "scheduled" : "published";
  const scheduled = kstDate(u.publishAt);
  const published = scheduledFuture ? null : kstDate(u.publishAt ?? u.at);
  const name = ((title ?? "").trim() || "제목 없는 영상").slice(0, 200);

  const meta = [`- 상태: ${scheduledFuture ? "예약됨" : "올림"}`];
  if (u.privacy && !u.publishAt) meta.push(`- 공개 범위: ${PRIVACY_LABEL[u.privacy] ?? u.privacy}`);
  if (scheduled) meta.push(`- 예약일: ${scheduled}`);
  if (published) meta.push(`- 발행일: ${published}`);
  meta.push(`- 발행 주소: ${u.url}`);
  const bodyMd = [`유튜브 영상 「${name}」`, "---", "## 발행 정보", meta.join("\n")].join("\n\n");

  const data: Record<string, string> = { 채널: "유튜브", 상태: status, "발행 주소": u.url };
  if (scheduled) data["예약일"] = scheduled;
  if (published) data["발행일"] = published;
  return { title: name, bodyMd, data };
}
