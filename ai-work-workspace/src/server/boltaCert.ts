// 볼타 공동인증서 만료 알림(2026-11-15) — 불러오는 것 없는 순수 함수라 서버(매일 알림)와 화면(볼타 패널)이 함께 쓴다.
const kstDate = (ms: number) => new Date(ms + 9 * 3_600_000).toISOString().slice(0, 10);
export function certDaysLeft(expiresAt: string, now = Date.now()): number | null {
  const end = Date.parse(expiresAt);
  if (!Number.isFinite(end)) return null;
  return Math.round((Date.parse(kstDate(end)) - Date.parse(kstDate(now))) / 86_400_000);
}
export function certReminderStage(expiresAt: string, now = Date.now()): 'expired' | '7' | '30' | null {
  const d = certDaysLeft(expiresAt, now);
  if (d === null) return null;
  if (d < 0) return 'expired';
  if (d <= 7) return '7';
  if (d <= 30) return '30';
  return null;
}
export function certReminderText(expiresAt: string, now = Date.now()): string {
  const d = certDaysLeft(expiresAt, now) ?? 0;
  const day = kstDate(Date.parse(expiresAt));
  return d < 0
    ? `볼타에 등록한 공동인증서가 ${day}에 만료됐습니다. 새 인증서를 볼타에 다시 등록해야 세금계산서를 발급할 수 있습니다.`
    : `볼타에 등록한 공동인증서가 ${d}일 뒤(${day}) 만료됩니다. 만료 전에 인증서를 갱신해 볼타에 다시 등록해 주세요.`;
}

// 2026-11-15 볼타 처음 설정: 「지금 할 일」 하나만 고른다(화면이 그 단계 버튼만 크게 보여 줌) — 순수 함수
export interface BoltaSetupState { keys: boolean; keyOk: boolean; mode: 'test' | 'live' | null; bizNo: boolean; issuer: boolean | null; cert: boolean | null; certExpires: string | null; liveAgreed: boolean }
export type BoltaNextStep = 'key' | 'biz' | 'issuer' | 'cert' | 'renew' | 'test' | 'agree' | 'done';
export function boltaNextStep(st: BoltaSetupState, now = Date.now()): BoltaNextStep {
  if (!st.keys || !st.keyOk) return 'key';
  if (!st.bizNo) return 'biz';
  if (st.issuer === false) return 'issuer';
  if (st.cert === false) return 'cert';
  if (st.cert && st.certExpires) {
    const d = certDaysLeft(st.certExpires, now);
    if (d !== null && d <= 30) return 'renew';
  }
  if (st.mode === 'test') return 'test';
  if (st.mode === 'live' && !st.liveAgreed) return 'agree';
  return 'done';
}
