import type { NaverCategory } from "@/lib/naverPublishing";

export function fetchNaverCategories(userId: string, blogId: string): Promise<NaverCategory[]> {
  return new Promise((resolve, reject) => {
    const requestId = crypto.randomUUID();
    const cleanup = () => { clearTimeout(timeout); window.removeEventListener("message", receive); };
    const receive = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      if (event.data?.source !== "nba-publishing-extension" || event.data.requestId !== requestId) return;
      cleanup();
      const response = event.data.result;
      if (response?.error) return reject(new Error(response.error));
      if (response?.blogId !== blogId || !Array.isArray(response?.categories)) return reject(new Error("연결된 블로그를 확인해 주세요."));
      resolve(response.categories);
    };
    const timeout = setTimeout(() => { cleanup(); reject(new Error("확장을 최신 버전으로 새로고침하고 이 화면도 새로고침해 주세요. 네이버 로그인 상태도 확인해 주세요.")); }, 45000);
    window.addEventListener("message", receive);
    window.postMessage({ source: "nba-publishing-app", type: "categories", requestId, userId, blogId }, window.location.origin);
  });
}
