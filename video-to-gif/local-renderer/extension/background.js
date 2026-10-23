// GIF 자동화 「내 PC 고속 변환」 확장 — 웹 화면 ↔ 로컬 렌더러(Native Messaging) 중계만 한다.
// 웹(video-to-gif.buylife.xyz)만 연결할 수 있고(manifest externally_connectable), 렌더러에는 받은 메시지를 그대로 넘긴다.
// 렌더러는 명령 문자열을 받지 않고 정해진 값만 받아 스스로 ffmpeg 인자를 만든다(host.pl / host.ps1).
const HOST = "xyz.buylife.gif_renderer";
const ALLOWED_ORIGINS = ["https://video-to-gif.buylife.xyz"];
const VERSION = chrome.runtime.getManifest().version_name;

function originOf(sender) {
  if (sender?.origin) return sender.origin;
  try {
    return new URL(sender?.url ?? "").origin;
  } catch {
    return "";
  }
}

chrome.runtime.onConnectExternal.addListener((port) => {
  if (!ALLOWED_ORIGINS.includes(originOf(port.sender))) {
    port.disconnect();
    return;
  }

  let native = null;
  const openNative = () => {
    if (native) return native;
    try {
      native = chrome.runtime.connectNative(HOST);
    } catch (error) {
      port.postMessage({ type: "error", code: "NO_HOST", message: String(error) });
      return null;
    }
    native.onMessage.addListener((message) => port.postMessage(message));
    native.onDisconnect.addListener(() => {
      const message = chrome.runtime.lastError?.message ?? "";
      native = null;
      // 렌더러가 설치되지 않았으면 Chrome이 「Specified native messaging host not found」를 준다.
      const code = /not found/i.test(message) ? "NO_HOST" : "HOST_CLOSED";
      try {
        port.postMessage({ type: "error", code, message });
      } catch {
        // 웹 쪽 연결이 이미 닫힘
      }
    });
    return native;
  };

  port.onMessage.addListener((message) => {
    if (message?.type === "ext-hello") {
      port.postMessage({ type: "ext-hello", version: VERSION });
      return;
    }
    openNative()?.postMessage(message);
  });
  port.onDisconnect.addListener(() => {
    native?.disconnect();
    native = null;
  });
});
