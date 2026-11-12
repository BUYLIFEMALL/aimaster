// U10 유튜브(2026-11-13, 업무 워크스페이스 담당 작성 — 음악 담당 플랜 docs/PLAN_20261113_YOUTUBE_UPLOAD_RECORDS.md §5):
// 유튜브 올리기 기록 한 건(playlist_youtube_uploads) → 업무 워크스페이스 「받은 업무」 내용(제목·본문·콘텐츠 캘린더용 데이터).
// 순수 함수 — tests/youtube-inbox.test.mjs. 데이터 키는 루트 docs/WORK_INBOX.md §5 규격.

export interface PlaylistUploadRow {
  video_id: string;
  url: string;
  title: string;
  privacy: string;
  publish_at: string | null;
  uploaded_at: string;
}

/** ISO 시각 → 한국 시간 날짜(YYYY-MM-DD) */
export function kstDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + 9 * 3_600_000).toISOString().slice(0, 10) : null;
}

const PRIVACY_LABEL: Record<string, string> = { private: "비공개", unlisted: "일부 공개", public: "공개" };

/** 상태: publish_at이 미래면 예약, 아니면 발행. 발행일: publish_at이 있으면 그것, 없으면 uploaded_at */
export function playlistUploadInboxContent(r: PlaylistUploadRow, now = Date.now()): { title: string; bodyMd: string; data: Record<string, string> } {
  const scheduledFuture = !!r.publish_at && Date.parse(r.publish_at) > now;
  const scheduled = kstDate(r.publish_at);
  const published = scheduledFuture ? null : kstDate(r.publish_at ?? r.uploaded_at);
  const name = ((r.title ?? "").trim() || "제목 없는 영상").slice(0, 200);
  const meta = [`- 상태: ${scheduledFuture ? "예약됨" : "올림"}`];
  if (!r.publish_at) meta.push(`- 공개 범위: ${PRIVACY_LABEL[r.privacy] ?? r.privacy}`);
  if (scheduled) meta.push(`- 예약일: ${scheduled}`);
  if (published) meta.push(`- 발행일: ${published}`);
  meta.push(`- 발행 주소: ${r.url}`);
  const bodyMd = [`유튜브 플레이리스트 영상 「${name}」`, "---", "## 발행 정보", meta.join("\n")].join("\n\n");
  const data: Record<string, string> = { 채널: "유튜브", 상태: scheduledFuture ? "scheduled" : "published", "발행 주소": r.url };
  if (scheduled) data["예약일"] = scheduled;
  if (published) data["발행일"] = published;
  return { title: name, bodyMd, data };
}
