// v1.21: 다른 프로그램에서 받은 그림의 변환을 처음 마치면 「변환 완료」 신호를 한 번만 보낸다(`POST /api/link-done`).
// 실패해도 변환·다운로드는 그대로. 한 번만 보내기는 공용 `link-mark`(사본 `linkMark.ts`, 직접 고치지 않음)
import { createOnceSender, type ViaSource } from "./linkMark";

const once = createOnceSender();

export function markLinkDone(via: ViaSource | undefined) {
  if (!via) return;
  once(via, () => {
    void fetch("/api/link-done", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ via }), keepalive: true }).catch(() => {});
  });
}
