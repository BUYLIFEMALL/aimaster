import "server-only";

const APP_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://kakao-auto-poster.vercel.app";

/** 새 리포트 생성 알림 이메일의 제목/본문(HTML)을 만든다. */
export function buildReportNotificationEmail(report: { id: string; title: string; summary: string }): {
  subject: string;
  html: string;
} {
  const url = `${APP_URL}/reports/${report.id}`;
  return {
    subject: `[카카오톡 뉴스레터 자동화] 새 리포트: ${report.title}`,
    html: `
      <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto;">
        <h2 style="color:#111;">📨 ${report.title}</h2>
        <p style="white-space:pre-line; color:#333; line-height:1.6;">${report.summary}</p>
        <p style="margin-top:24px;">
          <a href="${url}" style="display:inline-block; background:#facc15; color:#111; padding:10px 16px; border-radius:8px; text-decoration:none; font-weight:bold;">
            리포트 전체보기
          </a>
        </p>
      </div>
    `,
  };
}
