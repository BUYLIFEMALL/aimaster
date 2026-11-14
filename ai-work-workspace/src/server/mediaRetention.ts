// 데이터 보관 예외(2026-11-11 주인님 지정: 「음악·영상 데이터는 30일 보관, 그 외는 1년」 — 개인 업무·일정 자료라 길게 보관).
// 대상: 회원이 페이지에 올린 음악·영상 파일(files.mime audio/*·video/*) — 올린 지 30일 지나면 지운다.
// 회의 녹음은 받아쓰기 뒤 바로(실패 시 3일) 지우는 원본 규칙(meetings/audio.ts)이 따로 있어 그대로 둔다.
// 근거: docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §8 보관 기간 지정 목록. 예외 회원(관리자·시험 계정)은 지우지 않는다.
import { db } from "@/litpage/server/db.ts";

export const MEDIA_RETENTION_DAYS = 30;
const DAY = 86_400_000;

/** 30일 지난 음악·영상 파일 삭제. exempt = 보관 예외 회원 id */
/** 2026-11-14: storagePaths = 지운 줄 중 Storage에 둔 큰 파일의 경로 — 부르는 쪽이 Storage에서도 지운다(fileStorage.removeStorageObjects) */
export function runMediaRetention(now = Date.now(), limit = 2_000, exempt: ReadonlySet<string> = new Set()): { files: number; storagePaths: string[] } {
  const cutoff = now - MEDIA_RETENTION_DAYS * DAY;
  const skip = [...exempt];
  const notExempt = skip.length ? ` AND (user_id IS NULL OR user_id NOT IN (${skip.map(() => "?").join(", ")}))` : "";
  const ids = (db.prepare(`SELECT id FROM files WHERE created_time < ? AND (mime LIKE 'audio/%' OR mime LIKE 'video/%')${notExempt} ORDER BY created_time LIMIT ?`).all(cutoff, ...skip, limit) as { id: string }[]).map((r) => r.id);
  let files = 0;
  const storagePaths: string[] = [];
  for (let i = 0; i < ids.length; i += 200) {
    const part = ids.slice(i, i + 200);
    for (const r of db.prepare(`SELECT storage_path FROM files WHERE id IN (${part.map(() => "?").join(", ")}) AND storage_path IS NOT NULL`).all(...part) as { storage_path: string }[]) storagePaths.push(r.storage_path);
    files += db.prepare(`DELETE FROM files WHERE id IN (${part.map(() => "?").join(", ")})`).run(...part).changes;
  }
  return { files, storagePaths };
}
