// U4: AI 채팅 기록 30일 자동 삭제(최상위 규칙 — 생성 데이터는 생성일 기준 30일 뒤 삭제).
// 대상: 만든 지 30일이 지난 AI 대화(ai_threads)와 그 대화의 메시지(ai_messages)·되돌리기 기록(ai_changes),
//       30일 지난 AI 실행 기록(agent_runs)·수식 AI 평가(ai_formula_feedback).
// 회원이 쓴 페이지·데이터베이스(AI가 만들어 준 페이지 포함)는 회원 업무 자료라 건드리지 않는다.
// 하루 1회 예약 호출(/api/cron/jobs)에서 실행하고, 한 번에 지울 대화 수에 상한을 둬 나머지는 다음 날 지운다.
import { db } from "@/litpage/server/db.ts";
import "@/litpage/server/ai/threads.ts";
import "@/litpage/server/ai/changes.ts";
import "@/litpage/server/agents/runs.ts";
import "@/litpage/server/api/modules/formulaAi.ts";

export const AI_RETENTION_DAYS = 30;
const DAY = 86_400_000;

export interface AiRetentionResult {
  threads: number;
  messages: number;
  changes: number;
  runs: number;
  feedback: number;
}

export function runAiRetention(now = Date.now(), limit = 2_000): AiRetentionResult {
  const cutoff = now - AI_RETENTION_DAYS * DAY;
  const ids = (db.prepare("SELECT id FROM ai_threads WHERE created_time < ? ORDER BY created_time LIMIT ?").all(cutoff, limit) as { id: string }[]).map((r) => r.id);
  let messages = 0;
  let changes = 0;
  let threads = 0;
  // 대화 단위로 메시지·되돌리기 기록을 먼저 지우고 대화를 지운다(중간에 끊겨도 남은 대화는 다음 날 다시 지움)
  for (let i = 0; i < ids.length; i += 200) {
    const part = ids.slice(i, i + 200);
    const marks = part.map(() => "?").join(", ");
    messages += db.prepare(`DELETE FROM ai_messages WHERE thread_id IN (${marks})`).run(...part).changes;
    changes += db.prepare(`DELETE FROM ai_changes WHERE thread_id IN (${marks})`).run(...part).changes;
    threads += db.prepare(`DELETE FROM ai_threads WHERE id IN (${marks})`).run(...part).changes;
  }
  // 대화에 묶이지 않은 오래된 되돌리기 기록(대화 없이 쓴 AI 글쓰기 등)
  changes += db.prepare("DELETE FROM ai_changes WHERE created_time < ?").run(cutoff).changes;
  const runs = db.prepare("DELETE FROM agent_runs WHERE created_time < ?").run(cutoff).changes;
  const feedback = db.prepare("DELETE FROM ai_formula_feedback WHERE time < ?").run(cutoff).changes;
  return { threads, messages, changes, runs, feedback };
}
