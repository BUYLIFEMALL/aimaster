import "server-only";

// Phase 10 — 매일 자동 생성되는 리포트를 로그인 없이도 확인할 수 있게 이메일로 요약 발송.

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://trending-product-finder.vercel.app";

export interface ReportEmailItem {
  keyword: string;
  opportunityScore: number;
  reason: string | null;
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** 기회점수 상위 5개만 이메일에 담는다 — 전체는 링크를 눌러 리포트 화면에서 확인 */
const MAX_ITEMS = 5;

export function buildReportEmail(
  categoryName: string,
  items: ReportEmailItem[],
): { subject: string; html: string } {
  const top = items.slice(0, MAX_ITEMS);
  const topScore = top[0]?.opportunityScore ?? 0;
  const subject = `[상품소싱 자동화] "${categoryName}" 오늘의 기회 리포트 (최고 ${topScore}점)`;

  const rows = top
    .map(
      (i) => `
        <tr>
          <td style="padding:12px 0;border-bottom:1px solid #eee;">
            <div style="font-weight:700;color:#111;font-size:15px;">
              ${escapeHtml(i.keyword)}
              <span style="color:#0284c7;font-weight:700;margin-left:6px;">기회점수 ${i.opportunityScore}</span>
            </div>
            ${i.reason ? `<div style="color:#555;font-size:13px;margin-top:4px;line-height:1.5;">${escapeHtml(i.reason)}</div>` : ""}
          </td>
        </tr>`,
    )
    .join("");

  const html = `
  <div style="font-family:'Apple SD Gothic Neo','Malgun Gothic',sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#111;">
    <h2 style="margin:0 0 4px;font-size:20px;">📈 ${escapeHtml(categoryName)} 오늘의 기회 리포트</h2>
    <p style="color:#666;font-size:13px;margin:0 0 16px;">등록해두신 관심 키워드 기준으로 오늘 자동 생성된 리포트 요약입니다.</p>
    <table style="width:100%;border-collapse:collapse;">${rows}</table>
    <a href="${APP_URL}/reports"
      style="display:inline-block;margin-top:20px;padding:12px 22px;background:#0284c7;color:#fff;
      text-decoration:none;border-radius:8px;font-weight:700;font-size:14px;">
      전체 리포트 보러가기
    </a>
    <p style="color:#999;font-size:11px;margin-top:28px;line-height:1.5;">
      이 메일은 상품소싱 자동화의 관심 키워드 자동 리포트 알림입니다. 알림을 원하지 않으시면
      해당 관심 키워드를 비활성화해주세요.
    </p>
  </div>`;

  return { subject, html };
}

/** 카카오톡 친구톡/텔레그램용 순수 텍스트 요약(HTML 불가한 채널) */
export function buildReportText(categoryName: string, items: ReportEmailItem[]): string {
  const top = items.slice(0, MAX_ITEMS);
  const lines = top.map((i) => `• ${i.keyword} (기회점수 ${i.opportunityScore})${i.reason ? `\n  ${i.reason}` : ""}`);
  return [`📈 "${categoryName}" 오늘의 기회 리포트`, "", ...lines, "", `전체 보기: ${APP_URL}/reports`].join("\n");
}
