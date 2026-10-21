import "server-only";
import type { KeyProvider } from "@/lib/apiKeys";

// 연결 확인은 AI는 "모델 목록" 조회, 스톡은 검색 1회만 한다 — 생성 요청이 아니라 토큰 비용이 들지 않는다(개발·테스트 비용 최소화 지침).
const NAMES: Record<KeyProvider, string> = { gemini: "Google Gemini", openai: "OpenAI", anthropic: "Anthropic Claude", pexels: "Pexels", pixabay: "Pixabay", fal: "fal", replicate: "Replicate" };

export async function testProviderKey(provider: KeyProvider, key: string): Promise<{ ok: boolean; message: string }> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    let res: Response;
    if (provider === "gemini") {
      res = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1", { headers: { "x-goog-api-key": key }, signal: ctrl.signal, cache: "no-store" });
    } else if (provider === "openai") {
      res = await fetch("https://api.openai.com/v1/models", { headers: { Authorization: `Bearer ${key}` }, signal: ctrl.signal, cache: "no-store" });
    } else if (provider === "pexels") {
      res = await fetch("https://api.pexels.com/v1/search?query=nature&per_page=1", { headers: { Authorization: key }, signal: ctrl.signal, cache: "no-store" });
    } else if (provider === "pixabay") {
      res = await fetch(`https://pixabay.com/api/?key=${encodeURIComponent(key)}&q=nature&per_page=3`, { signal: ctrl.signal, cache: "no-store" });
    } else if (provider === "replicate") {
      res = await fetch("https://api.replicate.com/v1/account", { headers: { Authorization: `Bearer ${key}` }, signal: ctrl.signal, cache: "no-store" });
    } else if (provider === "fal") {
      // fal은 무료 확인용 주소가 없어, 없는 작업 번호의 상태를 묻는다 — 키가 맞으면 404(작업 없음), 틀리면 401/403. 생성 요청이 아니라 요금 없음
      res = await fetch("https://queue.fal.run/fal-ai/bytedance/requests/00000000-0000-0000-0000-000000000000/status", { headers: { Authorization: `Key ${key}` }, signal: ctrl.signal, cache: "no-store" });
      if (res.status === 404) res = new Response(null, { status: 200 });
    } else {
      res = await fetch("https://api.anthropic.com/v1/models?limit=1", { headers: { "x-api-key": key, "anthropic-version": "2023-06-01" }, signal: ctrl.signal, cache: "no-store" });
    }
    if (res.ok) return { ok: true, message: `본인 ${NAMES[provider]} 키 연결을 확인했습니다(${provider === "pexels" || provider === "pixabay" ? "검색 1회 — 무료" : provider === "fal" || provider === "replicate" ? "계정 확인 — 사용 요금 없음" : "모델 목록 조회 — 사용 요금 없음"}).` };
    if (res.status === 401 || res.status === 403 || res.status === 400) return { ok: false, message: `${NAMES[provider]}가 키를 거절했습니다. 발급받은 키를 공백 없이 다시 저장해 주세요.` };
    if (res.status === 429) return { ok: false, message: `${NAMES[provider]} 사용 한도에 걸렸습니다. 잠시 후 다시 확인해 주세요.` };
    return { ok: false, message: `${NAMES[provider]} 서버가 응답하지 않습니다(${res.status}). 잠시 후 다시 확인해 주세요.` };
  } catch {
    return { ok: false, message: `${NAMES[provider]} 서버에 연결하지 못했습니다. 잠시 후 다시 확인해 주세요.` };
  } finally {
    clearTimeout(timer);
  }
}
