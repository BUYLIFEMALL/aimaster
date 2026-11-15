// v1.57 메이커 후속 M3-② 7단계: 장면 JSON 버전 기록·되돌리기(화면·서버 공용 순수 함수).
// 저장(PATCH /api/items)할 때 서버가 직전 저장본의 장면 JSON(인트로·카드·아웃트로·해시태그·템플릿·사진 번호)을 최근 10개까지 남긴다.
// 디자인·배경·소리 설정만 바뀐 저장은 버전을 만들지 않고, 1분 안에 연달아 저장하면 한 번으로 친다(자동 저장이 기록을 밀어내지 않게).
// 같은 행(data.history)에 두므로 30일 보관 규칙(retentionRows.ts)도 그대로 따른다. 목록 응답에서는 빼서 가볍게 보낸다.

import type { ShortsScript } from "./script";

export const MAX_VERSIONS = 10;
export const VERSION_GAP_MS = 60_000;
export type SceneSnap = Pick<ShortsScript, "intro" | "cards" | "outro" | "hashtags" | "template" | "photoPlan">;
export type Version = { at: string; title: string; snap: SceneSnap };

export function snapOf(s: ShortsScript): SceneSnap {
  return structuredClone({ intro: s.intro, cards: s.cards, outro: s.outro, hashtags: s.hashtags, template: s.template, photoPlan: s.photoPlan });
}
const same = (a: SceneSnap, b: SceneSnap) => JSON.stringify(a) === JSON.stringify(b);

/** 서버 저장 직전: 직전 저장본(prev)의 장면 JSON을 기록에 넣은 새 저장본. 회원이 보낸 history는 쓰지 않는다(서버 기록이 기준) */
export function withVersion(prev: ShortsScript | null | undefined, next: ShortsScript, now = Date.now()): ShortsScript {
  const history = Array.isArray(prev?.history) ? prev!.history! : [];
  if (!prev?.intro || !Array.isArray(prev.cards)) return { ...next, history };
  if (same(snapOf(prev), snapOf(next))) return { ...next, history };
  if (history[0] && now - Date.parse(history[0].at) < VERSION_GAP_MS) return { ...next, history };
  return { ...next, history: [{ at: new Date(now).toISOString(), title: prev.intro.title || prev.topic, snap: snapOf(prev) }, ...history].slice(0, MAX_VERSIONS) };
}

/** 되돌리기: 장면 JSON만 그 버전으로(디자인·소리·배경 설정·업로드 기록은 지금 것 유지) */
export function restoreVersion(cur: ShortsScript, v: Version): ShortsScript {
  return { ...cur, ...structuredClone(v.snap) };
}

/** 목록 응답용: 버전 기록을 뺀 대본 */
export function withoutHistory<T>(data: T): T {
  if (!data || typeof data !== "object" || !("history" in (data as object))) return data;
  const { history: _h, ...rest } = data as Record<string, unknown>; void _h;
  return rest as T;
}
