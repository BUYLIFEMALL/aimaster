// AIMaster 2026-11-15(주인님 「둘 다 권장대로 진행해」, 플랜 ai-work-workspace/docs/PLAN_20261115_PUBLIC_FORM_AND_MCP.md B):
// 업무 비서(AI 채팅)가 회원이 연결한 바깥 MCP 서버의 도구를 부를 때의 회원별 추가 제한.
// 원본 mcp.ts의 https만·위험 주소 차단(safeFetch)·허용 주소 목록·토큰 비노출은 그대로 두고 위에 얹는다.
//  · 회원당 1분 30번(이 서버 인스턴스 기준) · 하루 500번(이식판 DB에 한국 날짜별로 셈 — 서버가 여러 개여도 맞음)
import { db } from './db.ts';
import { hit } from './ratelimit.ts';

export const MCP_CALLS_PER_MINUTE = 30;
export const MCP_CALLS_PER_DAY = 500;

let ready = false;
function ensureTable() {
  if (ready) return;
  db.exec('CREATE TABLE IF NOT EXISTS aww_mcp_usage (user_id TEXT NOT NULL, day TEXT NOT NULL, count INTEGER NOT NULL, PRIMARY KEY (user_id, day))');
  ready = true;
}

const kstDay = (now: number) => new Date(now + 9 * 3_600_000).toISOString().slice(0, 10);

/** 부를 수 있으면 null(그리고 하루 횟수 +1), 아니면 회원에게 보일 이유 */
export function memberMcpGate(userId: string, now = Date.now()): string | null {
  if (!hit(`aww-mcp-user:${userId}`, MCP_CALLS_PER_MINUTE, 60_000, now)) return `바깥 MCP 도구는 1분에 ${MCP_CALLS_PER_MINUTE}번까지 부를 수 있습니다. 잠시 후 다시 시도해 주세요.`;
  ensureTable();
  const day = kstDay(now);
  const row = db.prepare('SELECT count FROM aww_mcp_usage WHERE user_id = ? AND day = ?').get(userId, day) as { count: number } | undefined;
  if ((row?.count ?? 0) >= MCP_CALLS_PER_DAY) return `바깥 MCP 도구는 하루 ${MCP_CALLS_PER_DAY}번까지 부를 수 있습니다. 내일 다시 동작합니다.`;
  db.prepare('INSERT INTO aww_mcp_usage (user_id, day, count) VALUES (?, ?, 1) ON CONFLICT (user_id, day) DO UPDATE SET count = aww_mcp_usage.count + 1').run(userId, day);
  return null;
}

/** 키 화면 「오늘 쓴 횟수」 */
export function mcpUsedToday(userId: string, now = Date.now()): number {
  ensureTable();
  return (db.prepare('SELECT count FROM aww_mcp_usage WHERE user_id = ? AND day = ?').get(userId, kstDay(now)) as { count: number } | undefined)?.count ?? 0;
}
