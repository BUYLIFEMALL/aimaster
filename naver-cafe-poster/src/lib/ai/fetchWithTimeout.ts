import "server-only";

/**
 * 외부 AI API(OpenAI/Gemini) 호출이 응답도 에러도 없이 무한정 멈추는 현상을 실계정
 * 테스트로 확인했다(2026-09-13, "AI 자동 글쓰기(수동)" 페이지에서 generateCafePostAction이
 * 6분 넘게 pending 상태로 멈춰있었고, Vercel 로그에도 완료/타임아웃 기록이 전혀 없었다).
 * 일반 fetch는 상대 서버가 응답을 주지도 연결을 끊지도 않으면 영원히 기다리므로,
 * AbortController로 자체 타임아웃을 걸어 일정 시간 뒤 강제로 실패시킨다 — 그래야 버튼이
 * "생성 중..."에 갇히지 않고 사용자에게 명확한 에러를 보여주고 재시도할 수 있다.
 */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
  timeoutMessage = "AI 서버 응답이 너무 오래 걸려 요청을 중단했습니다. 잠시 후 다시 시도해주세요.",
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(timeoutMessage);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
