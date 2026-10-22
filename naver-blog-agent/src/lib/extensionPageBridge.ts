"use client";

// 웹 화면 → 크롬 확장(extension/web-bridge.js) 메시지. 같은 화면(이 사이트) 안에서만 오가며, 응답이 없으면 null.
// 서버 쪽 확장 작업 변환(src/lib/extensionBridge.ts)과는 다른 파일이다. 기준 구현: naver-blog-seo-studio/lib/extensionBridge.ts.
const APP = "nba-publishing-app";
const EXTENSION = "nba-publishing-extension";

export function askExtension<T>(type: string, timeoutMs: number, payload: Record<string, unknown> = {}): Promise<T | null> {
  return new Promise((resolve) => {
    const requestId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timer = window.setTimeout(() => { window.removeEventListener("message", onMessage); resolve(null); }, timeoutMs);
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data;
      if (data?.source !== EXTENSION || data.requestId !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(data.result as T);
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ ...payload, source: APP, type, requestId }, window.location.origin);
  });
}
