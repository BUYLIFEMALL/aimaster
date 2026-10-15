// 엑셀 처리 전용 백그라운드 작업(Web Worker, v1.02). 원본 데이터는 여기에만 두고 화면에는 작은 결과만 보낸다.
// 20만 행 기준 화면 멈춤: 읽기 약 4.4초·저장 7.3초 → 거의 없음. 파일은 여전히 이 브라우저 안에서만 처리된다.
import { handle, type StoreJob } from "./sheetStore";

self.onmessage = async (ev: MessageEvent<{ id: number; job: StoreJob }>) => {
  const { id, job } = ev.data;
  try {
    // 서식 유지 저장(v1.04)은 Promise를 돌려준다
    const result = (await handle(job)) as { bytes?: Uint8Array } | unknown;
    const bytes = (result as { bytes?: Uint8Array })?.bytes;
    (self as unknown as Worker).postMessage({ id, ok: true, result }, bytes ? [bytes.buffer] : []);
  } catch (e) {
    (self as unknown as Worker).postMessage({ id, ok: false, error: e instanceof Error ? e.message : "처리 중 오류" });
  }
};
