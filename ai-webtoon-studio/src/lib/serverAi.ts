import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 회원 본인 Gemini 키는 서버에서만 읽는다(브라우저로 보내지 않음 — v1.27, 최상위 규칙). 없으면 null(운영자 키 폴백 없음).
export async function getMemberGeminiKey(userId: string): Promise<string | null> {
  const { data } = await createAdminClient()
    .from("user_api_keys")
    .select("api_key")
    .eq("user_id", userId)
    .eq("provider", "gemini")
    .maybeSingle();
  const key = typeof data?.api_key === "string" ? data.api_key.trim() : "";
  return key || null;
}

export const NO_KEY_MESSAGE = "Gemini API 키가 등록되지 않았습니다. [API키등록·플랫폼연동]에서 본인 키를 등록해주세요.";

const GEMINI_API_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// 글 생성(시놉시스·캐릭터·콘티). 예전 브라우저 호출과 같은 모델·값이며, 키는 주소가 아니라 머리글로 보낸다.
export async function callGeminiTextServer(apiKey: string, prompt: string): Promise<string> {
  const res = await fetch(`${GEMINI_API_ENDPOINT}/gemini-2.5-flash:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    const msg = errorData?.error?.message || `HTTP ${res.status}`;
    throw new Error(`Gemini API 오류: ${msg}`);
  }
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini API로부터 응답 텍스트를 받지 못했습니다.");
  return text;
}
