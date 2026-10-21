// 2026-10-21 병합 C: AI 프롬프트 템플릿 자동화(prompt-template-studio)에서 옮긴 템플릿 타입·변수 함수.
export interface PromptTemplate {
  id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  variables: string[];
  createdAt: number;
}

// 템플릿 본문에서 {{변수명}}을 감지하여 고유한 변수명 배열을 추출하는 함수
export function extractVariables(content: string): string[] {
  if (!content) return [];
  const regex = /\{\{([^{}]+)\}\}/g;
  const matches = new Set<string>();
  let match;
  while ((match = regex.exec(content)) !== null) {
    const varName = match[1].trim();
    if (varName) {
      matches.add(varName);
    }
  }
  return Array.from(matches);
}

// 템플릿의 {{변수명}}을 실제 입력값으로 치환하는 함수
export function substituteVariables(content: string, values: Record<string, string>): string {
  if (!content) return "";
  return content.replace(/\{\{([^{}]+)\}\}/g, (_, varName) => {
    const key = varName.trim();
    return values[key] !== undefined ? values[key] : `{{${key}}}`;
  });
}
