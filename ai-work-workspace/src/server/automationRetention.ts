// U11 자동화(2026-11-10, 주인님 결정 4번) — 자동화 실행 기록·알림 30일 자동 삭제(생성 데이터 30일 규칙).
// 대상: 30일 지난 자동화 실행 기록(automation_runs — 자동화당 최근 100건 제한은 원본 그대로)과 30일 지난 알림(records tbl='notification').
// 자동화 설정 자체(회원 설정)·페이지·표는 지우지 않는다. 예외 회원(관리자·시험 계정, retention_exempt)의 기록은 남긴다.
// 하루 1회 운영 정리 작업(/api/cron/jobs)에서 실행하고, 한 번에 지울 수에 상한을 둬 나머지는 다음 날 지운다.
import { db } from "@/litpage/server/db.ts";
import "@/litpage/server/automations/engine.ts";

export const AUTOMATION_RETENTION_DAYS = 30;
const DAY = 86_400_000;

export interface AutomationRetentionResult {
  runs: number;
  notifications: number;
}

export function runAutomationRetention(now = Date.now(), limit = 5_000, exempt: ReadonlySet<string> = new Set()): AutomationRetentionResult {
  const cutoff = now - AUTOMATION_RETENTION_DAYS * DAY;
  const skip = [...exempt];
  const marks = skip.map(() => "?").join(", ");
  // 실행 기록: 자동화를 만든 회원이 예외면 남긴다(자동화가 이미 지워져 주인을 모르면 지움)
  const runIds = (
    db.prepare(
      `SELECT r.id FROM automation_runs r LEFT JOIN records a ON a.tbl = 'automation' AND a.id = r.automation_id
       WHERE r.time < ?${skip.length ? ` AND (a.id IS NULL OR json_extract(a.data, '$.created_by_id') NOT IN (${marks}))` : ""}
       ORDER BY r.time LIMIT ?`,
    ).all(cutoff, ...skip, limit) as { id: string }[]
  ).map((r) => r.id);
  let runs = 0;
  for (let i = 0; i < runIds.length; i += 200) {
    const part = runIds.slice(i, i + 200);
    runs += Number(db.prepare(`DELETE FROM automation_runs WHERE id IN (${part.map(() => "?").join(", ")})`).run(...part).changes ?? 0);
  }
  // 알림: 받는 회원이 예외면 남긴다
  const noteIds = (
    db.prepare(
      `SELECT id FROM records WHERE tbl = 'notification' AND CAST(json_extract(data, '$.created_time') AS REAL) < ?
       ${skip.length ? `AND json_extract(data, '$.user_id') NOT IN (${marks})` : ""} LIMIT ?`,
    ).all(cutoff, ...skip, limit) as { id: string }[]
  ).map((r) => r.id);
  let notifications = 0;
  for (let i = 0; i < noteIds.length; i += 200) {
    const part = noteIds.slice(i, i + 200);
    notifications += Number(db.prepare(`DELETE FROM records WHERE tbl = 'notification' AND id IN (${part.map(() => "?").join(", ")})`).run(...part).changes ?? 0);
  }
  return { runs, notifications };
}
