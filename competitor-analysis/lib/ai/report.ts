import "server-only";

/**
 * 분석 텍스트를 보기 좋은 HTML 리포트로 재가공한다(선택 기능, 버튼을 눌렀을 때만 호출).
 * 원본 Make.com 시나리오의 "이메일 제작"(Claude Sonnet) 모듈과 동일한 프롬프트를 재사용.
 */
export async function generateHtmlReport(summaryText: string, apiKey: string): Promise<string> {
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
          content: `You are tasked with creating a report in HTML format based on the provided content. Your goal is to deeply analyze the given information and present it in a well-structured, visually appealing report. Follow these instructions carefully:\n\n1. First, carefully read and analyze the following content:\n<content>\n${summaryText}\n</content>\n\n2. Create an HTML structure. Use inline CSS for styling. Include <!DOCTYPE html>, <html lang="ko">, <head> with meta/title, and <body> with a main container div.\n\n3. Style it to be visually appealing and easy to read — clean, professional design, responsive on desktop and mobile.\n\n4. Organize the content into logical sections (header/title, summary, competitor analysis, USP, content ideas).\n\n5. Use appropriate HTML tags (h1, h2, p, ul, table) and consistent styling.\n\n6. Your final output should be the complete HTML code only. Do not include any explanations or comments outside of the HTML code itself. Begin your response with <!DOCTYPE html> and end it with the closing </html> tag.`,
        },
      ],
    }),
  });
  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Anthropic 호출에 실패했습니다 (${response.status}): ${text.slice(0, 300)}`);
  }
  const json = await response.json();
  const text: string = json.content?.[0]?.text ?? "";
  return text.trim();
}
