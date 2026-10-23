// 브라우저 alert/confirm 대신 화면 안에 띄우는 알림·확인 창.
// 브라우저 창은 화면 전체를 멈추고 자동 검수도 막으므로, 이벤트로 DialogHost에 요청만 보낸다.
// DialogHost가 아직 없으면(화면 밖에서 호출 등) 기존 브라우저 창으로 대신한다.

export type DialogRequest =
  | { kind: "notify"; id: number; message: string }
  | { kind: "confirm"; id: number; message: string; resolve: (ok: boolean) => void };

export const DIALOG_EVENT = "nba-ui-dialog";
let seq = 0;
let hostReady = false;

export function setDialogHostReady(ready: boolean) {
  hostReady = ready;
}

/** 화면 아래에 잠시 보이는 알림. 기존 alert(message)와 같은 자리에서 쓴다. */
export function notify(message: string): void {
  if (typeof window === "undefined") return;
  if (!hostReady) { window.alert(message); return; }
  window.dispatchEvent(new CustomEvent<DialogRequest>(DIALOG_EVENT, { detail: { kind: "notify", id: ++seq, message } }));
}

/** 확인 창. 확인=true, 취소·닫기·Esc=false. 기존 confirm(message) 자리에서 await 해서 쓴다. */
export function askConfirm(message: string): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (!hostReady) return Promise.resolve(window.confirm(message));
  return new Promise((resolve) => {
    window.dispatchEvent(new CustomEvent<DialogRequest>(DIALOG_EVENT, { detail: { kind: "confirm", id: ++seq, message, resolve } }));
  });
}
