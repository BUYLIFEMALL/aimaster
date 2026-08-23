import "server-only";

/**
 * 분석 텍스트를 보기 좋은 HTML 리포트로 재가공한다(선택 기능, 버튼을 눌렀을 때만 호출).
 * 원본 Make.com 시나리오의 "이메일 제작"(Claude Sonnet) 모듈과 동일한 프롬프트를 재사용.
 */
export async function generateHtmlReport(summaryText: string, apiKey: string): Promise<string> {
  // Claude는 오늘 날짜를 모르기 때문에(2024로 하드코딩해서 저작권 연도를 지어내는 등) 실제
  // 생성 시점 날짜를 프롬프트에 명시적으로 넣어준다(2026-08-22, 실사용에서 "© 2024"로 잘못
  // 나온 것을 발견해 수정).
  const now = new Date();
  const todayKorean = `${now.getFullYear()}년 ${now.getMonth() + 1}월 ${now.getDate()}일`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: `You are tasked with creating a report in HTML format based on the provided content. Your goal is to deeply analyze the given information and present it in a well-structured, visually appealing report. Follow these instructions carefully:\n\n0. Today's actual date is ${todayKorean} (${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}). If the report shows a generation date or a copyright year (e.g. in a footer like "© YYYY ..."), you MUST use this real date/year — never invent or assume a different year.\n\n1. First, carefully read and analyze the following content:\n<content>\n${summaryText}\n</content>\n\n2. Create an HTML structure. Use inline CSS for styling. Include <!DOCTYPE html>, <html lang="ko">, <head> with meta/title, and <body> with a main container div.\n\n3. Style it to be visually appealing and easy to read — clean, professional design, responsive on desktop and mobile.\n\n4. Organize the content into logical sections (header/title, summary, competitor analysis, USP, content ideas).\n\n5. Use appropriate HTML tags (h1, h2, p, ul, table) and consistent styling.\n\n6. Your final output should be the complete HTML code only. Do not include any explanations or comments outside of the HTML code itself. Begin your response with <!DOCTYPE html> and end it with the closing </html> tag.`,
        },
      ],
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Anthropic 호출에 실패했습니다 (${response.status}): ${text.slice(0, 300)}`);
  }
  const json = await response.json();
  // claude-sonnet-5는 이 정도 복잡한 요청에서 확장 사고(extended thinking) 블록을 먼저
  // 반환할 수 있다 — content[0]이 "thinking" 타입이고 실제 텍스트는 그 뒤 블록에 있다.
  // 무조건 content[0]을 읽으면 빈 문자열이 되는 버그가 있었다(2026-08-22 실제로 재현/확인).
  const textBlock = (json.content ?? []).find((block: { type: string; text?: string }) => block.type === "text");
  const text: string = textBlock?.text ?? "";
  if (!text) {
    throw new Error("Claude 응답에서 리포트 텍스트를 찾지 못했습니다. 다시 시도해주세요.");
  }
  return text.trim();
}
