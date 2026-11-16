// v1.33 상세페이지 「GIF 받기」 창을 열고 결과 1건을 보낸다 — GIF 변환·상품 사진 영상 공용(창 다루기).
// 약속(주소·메시지)은 공용 사본 gifHandoff.ts, 형식·크기 준비는 shopPayload.ts.
import { GIF_INBOX_PATH, GIF_RECEIVER_ORIGIN, MSG_FILE, isReadyMessage } from "./gifHandoff";
import { shopPayload } from "./shopPayload";

/**
 * 받는 창이 정확한 주소(shop-detail-page)에서 「준비됨」을 보내면 그때 파일을 보낸다 —
 * 로그인을 거쳐 늦게 준비돼도, 다시 열려도 그대로 받는다. 돌려주는 함수는 대기 정리용.
 */
export function openShopInbox(getBlob: () => Promise<Blob>, rawName: string, note: (text: string) => void): () => void {
  const win = window.open(`${GIF_RECEIVER_ORIGIN}${GIF_INBOX_PATH}`, "aimaster-gif-inbox");
  if (!win) {
    note("새 창이 막혔습니다. 주소창 오른쪽의 팝업 허용을 누른 뒤 다시 눌러 주세요.");
    return () => {};
  }
  note("상세페이지 창을 여는 중입니다…");
  // 「준비됨」 신호를 놓치지 않게 대기를 먼저 걸고, 파일은 신호를 받은 뒤 기다린다.
  const payload = getBlob().then((b) => shopPayload(b, rawName));
  let sent = false;
  const onMessage = async (e: MessageEvent) => {
    if (e.source !== win || !isReadyMessage(e.origin, e.data)) return;
    const p = await payload;
    if ("error" in p) { note(p.error); cleanup(); return; }
    win.postMessage({ type: MSG_FILE, name: p.name, file: p.file }, GIF_RECEIVER_ORIGIN);
    sent = true;
    note(`보냈습니다(${p.kind === "webp" ? "WebP" : "GIF"}). 상세페이지 창에서 상품과 섹션을 골라 「이 섹션에 넣기」를 눌러 주세요.`);
  };
  const slow = window.setTimeout(() => {
    if (!sent) note("상세페이지 창이 아직 준비되지 않았습니다. 로그인 화면이면 로그인해 주세요 — 열리면 자동으로 넘어갑니다.");
  }, 10_000);
  const watch = window.setInterval(() => { if (win.closed) cleanup(); }, 1000);
  function cleanup() {
    window.removeEventListener("message", onMessage);
    window.clearTimeout(slow);
    window.clearInterval(watch);
  }
  window.addEventListener("message", onMessage);
  return cleanup;
}
