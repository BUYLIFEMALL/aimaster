import "server-only";

// AI에게 "1~2문장마다 줄바꿈(빈 줄)을 넣어라"고 프롬프트로 지시해도 모델이
// 한 줄로 이어붙이는 경우가 잦다. 프롬프트 지시만 믿지 않고, 모델이 줄바꿈을
// 안 넣었을 때 코드에서 문장 단위로 잘라 강제로 문단을 나눠주는 안전장치.
export function ensureParagraphBreaks(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;

  if (trimmed.includes("\n\n")) return trimmed;

  const sentences = trimmed
    .split(/(?<=[.!?~])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) return trimmed;

  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    paragraphs.push(sentences.slice(i, i + 2).join(" "));
  }

  return paragraphs.join("\n\n");
}
