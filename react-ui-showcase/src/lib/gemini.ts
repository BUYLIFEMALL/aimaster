import { GoogleGenAI } from "@google/genai";

export async function generateCustomComponent(apiKey: string, prompt: string, componentType?: string) {
  if (!apiKey) {
    throw new Error("Gemini API 키가 등록되지 않았습니다. [API키등록·플랫폼연동] 메뉴에서 본인 키를 등록해주세요.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `당신은 최고 수준의 프론트엔드 React 및 Tailwind CSS 전문 아키텍트입니다.
사용자가 요청한 UI 컴포넌트를 React 19 + Tailwind CSS 기반의 깨끗하고 완벽히 독립 실행 가능한 단일 TSX 컴포넌트 코드로 작성하세요.

규칙:
1. 반드시 순수한 TSX 코드만 마크다운 코드 블록(\`\`\`tsx ... \`\`\`)으로 출력하세요.
2. 컴포넌트는 외부 커스텀 패키지 의존성 없이 React 네이티브 기능과 Tailwind CSS 유틸리티 클래스만 사용해야 합니다.
3. 흰색 베이스(Slate/Zinc Light) 테마를 기본으로 하고 높은 심미성과 접근성을 갖춰야 합니다.
4. 연도는 당해 연도(현재 2026년) 기준을 유지하세요.
5. 설명문이나 인사말은 생략하고 오직 TSX 코드 블록만 반환하세요.`;

  const userContent = `요청 컴포넌트 타입: ${componentType || '자유 컴포넌트'}
요청 상세 설명: ${prompt}

위 요구사항을 충족하는 모던 React 19 + Tailwind CSS 컴포넌트를 작성해주세요.`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      { role: "user", parts: [{ text: userContent }] }
    ],
    config: {
      systemInstruction: { parts: [{ text: systemInstruction }] },
      temperature: 0.4,
    }
  });

  const text = response.text || "";
  const codeMatch = text.match(/```(?:tsx|jsx|typescript|javascript)?\s*([\s\S]*?)```/);
  const cleanCode = codeMatch ? codeMatch[1].trim() : text.trim();

  return cleanCode;
}
