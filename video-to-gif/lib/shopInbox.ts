// v1.33 상세페이지 「GIF 받기」 창을 열고 결과 1건을 보낸다 — GIF 변환·상품 사진 영상 공용(창 다루기).
// 약속(주소·메시지)은 공용 사본 gifHandoff.ts, 형식·크기 준비는 shopPayload.ts.
import { GIF_INBOX_PATH, GIF_RECEIVER_ORIGIN, MSG_FILE, isReadyMessage } from "./gifHandoff";
import { shopPayload } from "./shopPayload";

/**
 * 받는 창이 정확한 주소(shop-detail-page)에서 「준비됨」을 보내면 그때 파일을 보낸다 —
 * 로그인을 거쳐 늦게 준비돼도 받는다. 한 번 호출에 자동 전송은 최대 1번이다
 * (MOV-20261116-02: 같은 「준비됨」이 겹치거나 받는 창이 다시 준비돼도 다시 보내지 않음 —
 * 다시 보내려면 사용자가 버튼을 다시 눌러 새로 호출). 돌려주는 함수는 대기 정리용이며,
 * 정리한 뒤에는 파일을 기다리던 중이었어도 보내지 않는다.
 */
export function openShopInbox(getBlob: () => Promise<Blob>, rawName: string, note: (text: string) => void): () => void {
  const win = window.open(`${GIF_RECEIVER_ORIGIN}${GIF_INBOX_PATH}`, "aimaster-gif-inbox");
  if (!win) {
    note("새 창이 막혔습니다. 주소창 오른쪽의 팝업 허용을 누른 뒤 다시 눌러 주세요.");
    return () => {};
  }
  note("상세페이지 창을 여는 중입니다…");
  // 「준비됨」 신호를 놓치지 않게 대기를 먼저 걸고, 파일은 신호를 받은 뒤 기다린다.
  // getBlob이 바로 throw하거나 거절해도 호출부로 새지 않게 Promise 안에서 부른다.
  const payload = new Promise<Blob>((resolve) => resolve(getBlob())).then((b) => shopPayload(b, rawName));
  payload.catch(() => {}); // 「준비됨」이 오기 전 실패도 처리되지 않은 거절로 남기지 않음
  let active = true; // 정리(cleanup) 뒤 false — 기다리던 작업도 보내지 않는다
  let claimed = false; // 자동 전송권: 첫 정상 「준비됨」이 기다리기 전에 예약한다
  let sent = false;
  const onMessage = async (e: MessageEvent) => {
    if (!active || claimed) return;
    if (e.source !== win || !isReadyMessage(e.origin, e.data)) return;
    claimed = true;
    let p: Awaited<typeof payload>;
    try {
      p = await payload;
    } catch {
      if (active) { note("보낼 파일을 준비하지 못했습니다. 결과를 확인한 뒤 다시 눌러 주세요."); cleanup(); }
      return;
    }
    if (!active) return;
    if ("error" in p) { note(p.error); cleanup(); return; }
    win.postMessage({ type: MSG_FILE, name: p.name, file: p.file }, GIF_RECEIVER_ORIGIN);
    sent = true;
    note(`보냈습니다(${p.kind === "webp" ? "WebP" : "GIF"}). 상세페이지 창에서 상품과 섹션을 골라 「이 섹션에 넣기」를 눌러 주세요.`);
    cleanup();
  };
  const slow = window.setTimeout(() => {
    if (!sent) note("상세페이지 창이 아직 준비되지 않았습니다. 로그인 화면이면 로그인해 주세요 — 열리면 자동으로 넘어갑니다.");
  }, 10_000);
  const watch = window.setInterval(() => { if (win.closed) cleanup(); }, 1000);
  function cleanup() {
    active = false;
    window.removeEventListener("message", onMessage);
    window.clearTimeout(slow);
    window.clearInterval(watch);
  }
  window.addEventListener("message", onMessage);
  return cleanup;
}
