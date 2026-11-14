// 2026-11-14 주인님 「진행해」(스텝메일 매뉴얼에서 뺐던 기능 세 가지를 실제로 구현) — 순수 함수(서버·시험에서 함께 씀).
// 1) 메일 개인화 {닉네임}  2) 발송 간격(무작위 2~5초)  3) 계정별 하루 한도(오늘 보낸 수를 발송 기록에서 셈).

/** 메일 사이 쉬는 시간(밀리초). 한꺼번에 몰아 보내면 메일 서비스가 계정을 스팸으로 막기 쉬워 사람처럼 간격을 둔다. */
export const SEND_GAP_MIN_MS = 2000;
export const SEND_GAP_MAX_MS = 5000;
/** 한 번 실행에 쓸 수 있는 시간. Vercel 함수 한도(300초) 안에서 저장·기록할 여유를 남긴다. 남은 리드는 다음 실행 때 보낸다. */
export const RUN_BUDGET_MS = 240_000;

export function randomGapMs(random: () => number = Math.random): number {
  return SEND_GAP_MIN_MS + Math.floor(random() * (SEND_GAP_MAX_MS - SEND_GAP_MIN_MS + 1));
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);
}

/** 제목·본문의 {닉네임}을 받는 사람 닉네임으로(없으면 「고객」). 본문은 HTML이라 닉네임의 특수문자를 바꿔 넣는다. 문자(lib/sms.ts)와 같은 태그. */
export function personalizeEmail(subject: string, bodyHtml: string, nickname: string | null): { subject: string; bodyHtml: string } {
  const name = nickname?.trim() || "고객";
  return {
    subject: subject.replaceAll("{닉네임}", name),
    bodyHtml: bodyHtml.replaceAll("{닉네임}", escapeHtml(name)),
  };
}

/**
 * 계정 하나가 하루에 보낼 수 있는 메일 수. 각 메일 서비스 공지 한도(네이버·다음 약 500통, Gmail 개인 500통)보다
 * 조금 낮게 잡아 계정이 막히지 않게 한다. 회사 메일(그 밖의 SMTP)은 서비스마다 달라 보수적으로 300통.
 */
export function dailyLimitForHost(host: string): number {
  const h = host.toLowerCase();
  if (h.includes("naver")) return 400;
  if (h.includes("daum") || h.includes("hanmail") || h.includes("kakao")) return 400;
  if (h.includes("gmail") || h.includes("google")) return 400;
  return 300;
}

/** 한국 시간 오늘 0시의 ISO 문자열(발송 기록 sent_at과 비교). */
export function kstDayStartIso(now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 3600_000);
  const midnightUtc = Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) - 9 * 3600_000;
  return new Date(midnightUtc).toISOString();
}

/**
 * 로테이션 순서에서 다음 계정을 고른다. start부터 차례로 보며 오늘 보낸 수가 한도 아래인 첫 계정의 위치, 모두 찼으면 -1.
 */
export function pickAccountIndex(accounts: { id: string; smtp_host: string }[], usedToday: Map<string, number>, start: number): number {
  for (let k = 0; k < accounts.length; k++) {
    const idx = (start + k) % accounts.length;
    const acc = accounts[idx];
    if ((usedToday.get(acc.id) ?? 0) < dailyLimitForHost(acc.smtp_host)) return idx;
  }
  return -1;
}
