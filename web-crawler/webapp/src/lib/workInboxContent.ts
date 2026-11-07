// U10 2차(2026-11-07): 완료된 수집 작업 한 건 → 업무 워크스페이스 「받은 업무」 내용(제목·본문·표 행용 구조 데이터).
// 순수 함수(가져오기 없음) — tests/work-inbox-content.test.cjs. 수집 결과는 워크스페이스에서 「표에 행으로 넣기」(종류 link)로 받는다.
// 결과 엑셀은 비공개 저장소의 10분짜리 임시 주소라 넣지 않고, 프로그램 작업 목록에서 받도록 안내한다.

export interface CrawlJobForInbox {
  url: string;
  target_fields: string[] | null;
  row_count: number | null;
  completed_at: string | null;
  created_at: string;
  pii_warning?: boolean | null;
}

/** ISO 시각 → 한국 시간 날짜(YYYY-MM-DD) */
export function kstDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? new Date(t + 9 * 3_600_000).toISOString().slice(0, 10) : null;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 60);
  }
}

export function crawlJobInboxContent(job: CrawlJobForInbox, jobsUrl: string): { title: string; bodyMd: string; data: Record<string, string | number> } {
  const host = hostOf(job.url);
  const rows = job.row_count ?? 0;
  const day = kstDate(job.completed_at) ?? kstDate(job.created_at);
  const fields = (job.target_fields ?? []).filter(Boolean);
  const title = `웹 수집 — ${host} (${rows.toLocaleString("ko-KR")}행)`.slice(0, 200);

  const lines = [
    `「${host}」에서 수집한 결과입니다.`,
    "",
    `- 수집 주소: ${job.url}`,
    `- 수집 항목: ${fields.length ? fields.join(", ") : "-"}`,
    `- 행 수: ${rows.toLocaleString("ko-KR")}행`,
  ];
  if (day) lines.push(`- 완료일: ${day}`);
  lines.push("", `엑셀 파일은 웹 크롤러 작업 목록(${jobsUrl})에서 「엑셀 다운로드」로 받습니다(본인 확인 뒤 임시 주소).`);
  if (job.pii_warning) lines.push("", "⚠️ 수집된 데이터에 개인정보로 보이는 항목이 있을 수 있습니다. 이용 목적과 법적 근거를 확인한 뒤 사용해 주세요.");

  const data: Record<string, string | number> = { 주소: job.url, "행 수": rows, "수집 항목": fields.join(", ") };
  if (day) data["완료일"] = day;
  return { title, bodyMd: lines.join("\n"), data };
}
