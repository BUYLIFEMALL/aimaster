import { AiStructuredItem } from "./types";

const CURRENT_YEAR = new Date().getFullYear(); // 2026년 동적 주입

/**
 * Gemini API 연결 테스트
 */
export async function testGeminiConnection(apiKey: string): Promise<boolean> {
  if (!apiKey.trim()) {
    throw new Error("API 키가 입력되지 않았습니다.");
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey.trim()}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: "Hello, reply with OK if connection is working." }] }],
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData?.error?.message || `API 연결 실패 (상태 코드: ${response.status})`
    );
  }

  return true;
}

/**
 * HTML에서 주요 리스트 항목을 구조화된 JSON으로 추출
 */
export async function analyzeHtmlWithGemini(
  apiKey: string,
  targetUrl: string,
  cleanedHtml: string,
  model = "gemini-2.5-flash"
): Promise<AiStructuredItem[]> {
  if (!apiKey.trim()) {
    throw new Error("Gemini API 키가 설정되지 않았습니다. 설정에서 API 키를 입력해주세요.");
  }
  if (!cleanedHtml.trim()) {
    throw new Error("분석할 HTML 데이터가 비어 있습니다.");
  }

  const prompt = `
당신은 웹 데이터 마이닝 및 HTML 파싱 전문가입니다.
현재 연도는 ${CURRENT_YEAR}년입니다.
아래 제공된 웹사이트의 HTML 코드에서 주요 리스트 항목(게시물, 상품, 뉴스, 피드 등 반복되는 핵심 요소)을 찾아 구조화된 JSON 데이터로 추출해주세요.

각 항목은 반드시 다음 속성을 포함해야 합니다:
1. no: 순번 (1부터 시작하는 숫자)
2. title: 항목의 제목 또는 주요 텍스트
3. url: 해당 항목의 상세 페이지 링크 (상대 경로인 경우 원본 도메인 "${targetUrl}"을 접두사로 붙여 반드시 유효한 절대 경로 http/https로 완성할 것)
4. imgUrl: 해당 항목의 대표 썸네일 이미지 링크 (상대 경로인 경우 원본 도메인을 붙여 절대 경로로 완성하고, 없으면 빈 문자열 ""로 둘 것)

대상 사이트 URL: ${targetUrl}
HTML 내용:
${cleanedHtml.slice(0, 45000)}

반드시 마크다운 코드블록(\`\`\`json) 없이 순수 JSON 배열 [...] 형식으로만 응답하세요.
`;

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
      },
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData?.error?.message || `Gemini API 호출 실패 (${response.status})`);
  }

  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    throw new Error("Gemini AI로부터 응답 텍스트를 받지 못했습니다.");
  }

  try {
    const rawClean = text.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(rawClean);
    if (!Array.isArray(parsed)) {
      throw new Error("AI 응답이 배열 형식이 아닙니다.");
    }

    const origin = new URL(targetUrl).origin;
    return parsed.map((item: any, idx: number) => ({
      no: typeof item.no === "number" ? item.no : idx + 1,
      title: String(item.title || "제목 없음").trim(),
      url: item.url ? (item.url.startsWith("http") ? item.url : new URL(item.url, origin).href) : targetUrl,
      imgUrl: item.imgUrl ? (item.imgUrl.startsWith("http") ? item.imgUrl : new URL(item.imgUrl, origin).href) : "",
    }));
  } catch (err: any) {
    throw new Error(`AI 응답 데이터 파싱 실패: ${err.message}`);
  }
}
