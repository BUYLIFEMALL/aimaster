import "server-only";
import { GoogleGenAI } from "@google/genai";

// 「🧩 컴포넌트 갤러리 → AI 컴포넌트 생성기」(2026-10-21 병합 D — 옛 AI 웹 UI의 lib/gemini.ts에서 옮김).
// 회원 본인 Gemini 키만 받는다(브라우저가 보낸 키는 쓰지 않는다).
export async function generateComponentCode(apiKey: string, prompt: string, componentType?: string): Promise<string> {
  const currentYear = new Date().getFullYear();
  const systemInstruction = `당신은 최고 수준의 프론트엔드 React 및 Tailwind CSS 전문 아키텍트입니다.
사용자가 요청한 UI 컴포넌트를 React 19 + Tailwind CSS 기반의 깨끗하고 완벽히 독립 실행 가능한 단일 TSX 컴포넌트 코드로 작성하세요.

규칙:
1. 반드시 순수한 TSX 코드만 마크다운 코드 블록(\`\`\`tsx ... \`\`\`)으로 출력하세요.
2. 컴포넌트는 외부 커스텀 패키지 의존성 없이 React 네이티브 기능과 Tailwind CSS 유틸리티 클래스만 사용해야 합니다.
3. 흰색 베이스(Slate/Zinc Light) 테마를 기본으로 하고 높은 심미성과 접근성을 갖춰야 합니다.
4. [기준 연도 엄수: 현재 연도는 ${currentYear}년입니다. 날짜·연도 표기는 반드시 ${currentYear}년(당해 연도) 기준으로 작성하고 과거 연도로 퇴행하지 마세요.]
5. 화면에 보이는 글은 한국어로 쓰고, 사람 이미지가 필요하면 한국인 기준으로 설명하세요.
6. 설명문이나 인사말은 생략하고 오직 TSX 코드 블록만 반환하세요.`;

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [{ role: "user", parts: [{ text: `요청 컴포넌트 타입: ${componentType || "자유 컴포넌트"}\n요청 상세 설명: ${prompt}\n\n위 요구사항을 충족하는 모던 React 19 + Tailwind CSS 컴포넌트를 작성해주세요.` }] }],
    config: { systemInstruction: { parts: [{ text: systemInstruction }] }, temperature: 0.4 },
  });
  const text = response.text || "";
  const m = text.match(/```(?:tsx|jsx|typescript|javascript)?\s*([\s\S]*?)```/);
  return (m ? m[1] : text).trim();
}
