import "server-only";

// AI에게 "1~2문장마다 줄바꿈(빈 줄)을 넣어라"고 프롬프트로 지시해도, 특히
// response_format: json_object 모드에서는 모델이 컴팩트한 JSON을 우선시해서
// 문자열 안에 실제 \n\n을 넣지 않고 한 줄로 이어붙이는 경우가 잦다.
// 프롬프트 지시만 믿지 않고, 모델이 줄바꿈을 안 넣었을 때 코드에서 문장 단위로
// 잘라 강제로 문단을 나눠주는 안전장치.
export function ensureParagraphBreaks(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  // 모델이 이미 지시대로 빈 줄을 넣었다면 그대로 존중한다.
  if (trimmed.includes("\n\n")) return trimmed;

  // 문장 종결 부호(. ! ? ~) 뒤 공백을 기준으로 문장을 분리한다.
  const sentences = trimmed
    .split(/(?<=[.!?~])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) return trimmed;

  // 1~2문장마다 문단을 끊는다.
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paragraphs.push(sentences.slice(i, i + 2).join(" "));
  }

  return paragraphs.join("\n\n");
}
