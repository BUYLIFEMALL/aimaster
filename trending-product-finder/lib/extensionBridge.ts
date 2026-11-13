// 우리 사이트 화면 → 상품소싱 확장(web-bridge.js) 묻기. 확장이 없거나 답이 없으면 null.
export function askExtension<T>(type: string, timeoutMs: number, payload: Record<string, unknown> = {}): Promise<T | null> {
  return new Promise((resolve) => {
    const requestId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve(null);
    }, timeoutMs);
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (event.data?.source !== "tpf-extension" || event.data.requestId !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(event.data.result as T);
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ ...payload, source: "tpf-app", type, requestId }, window.location.origin);
  });
}
