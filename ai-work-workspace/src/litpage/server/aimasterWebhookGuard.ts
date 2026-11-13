// AIMaster 2026-11-13(주인님 「권장안대로」, 플랜 ai-work-workspace/docs/PLAN_20261113_U14_AND_DEFERRED.md §2-1):
// 자동화·버튼 「웹훅 보내기」 회원별 추가 제한. 원본 safefetch.ts(위험 주소 차단)·자동화별 분당 한도·실패 시 즉시 일시정지는 그대로 두고 위에 얹는다.
//  · https 주소만
//  · 회원당 분당 20회(이 서버 인스턴스 기준) · 하루 500회(이식판 DB에 날짜별로 셈 — 서버가 여러 개여도 맞음)
import { db } from './db.ts';
import { hit } from './ratelimit.ts';

export const WEBHOOK_PER_MINUTE = 20;
export const WEBHOOK_PER_DAY = 500;

let ready = false;
function ensureTable() {
  if (ready) return;
  db.exec('CREATE TABLE IF NOT EXISTS aww_webhook_usage (user_id TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (user_id, day))');
  ready = true;
}

const kstDay = (now: number) => new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);

/** 보낼 수 있으면 null(그리고 하루 횟수 +1), 아니면 회원에게 보일 이유 */
export function memberWebhookGate(userId: string, url: string, now = Date.now()): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return '웹훅 주소가 올바르지 않습니다.';
  }
  if (u.protocol !== 'https:') return '웹훅 주소는 https:// 로 시작해야 합니다.';
  if (!hit(`aww-webhook-user:${userId}`, WEBHOOK_PER_MINUTE, 60_000, now)) return `웹훅은 1분에 ${WEBHOOK_PER_MINUTE}번까지 보낼 수 있습니다. 잠시 후 다시 시도해 주세요.`;
  ensureTable();
  const day = kstDay(now);
  const row = db.prepare('SELECT count FROM aww_webhook_usage WHERE user_id = ? AND day = ?').get(userId, day) as { count: number } | undefined;
  if ((row?.count ?? 0) >= WEBHOOK_PER_DAY) return `웹훅은 하루 ${WEBHOOK_PER_DAY}번까지 보낼 수 있습니다. 내일 다시 동작합니다.`;
  db.prepare('INSERT INTO aww_webhook_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT (user_id, day) DO UPDATE SET count = aww_webhook_usage.count + 1').run(userId, day);
  return null;
}
