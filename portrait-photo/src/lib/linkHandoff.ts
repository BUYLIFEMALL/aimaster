// v1.39: 서버 보관함 결과를 다른 프로그램으로 처음 넘길 때(「형식 바꾸기」·「스토리보드로」) 한 번만 기록을 보낸다(`POST /api/link-handoff`).
// 실패해도 이동은 그대로. 한 번만 보내기는 공용 `link-mark`(사본 `linkMark.ts`, 직접 고치지 않음)
import { createOnceSender } from "./linkMark";

export const HANDOFF_TARGETS = ["image-convert-studio", "cinematic-storyboard-studio"] as const;
export type HandoffTarget = (typeof HANDOFF_TARGETS)[number];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isHandoffItemId(v: unknown): v is string {
  return typeof v === "string" && UUID.test(v);
}

const once = createOnceSender();

export function markHandoff(itemId: string, to: HandoffTarget) {
  once(`${itemId}|${to}`, () => {
    void fetch("/api/link-handoff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to, itemId }), keepalive: true }).catch(() => {});
  });
}
