// 페르소나(화자), 말끝, 문체는 서로 독립된 선택입니다.
export const WRITING_TONES = [
  { value: "해요체", description: "친근한 존댓말", prompt: "본문 문장은 '~해요/~이에요/~예요' 등 자연스러운 존댓말로 끝낸다." },
  { value: "합니다체", description: "격식 있는 존댓말", prompt: "본문 문장은 '~합니다/~습니다/~입니다' 등 격식 있는 존댓말로 끝낸다." },
  { value: "친근한 반말", description: "친구에게 말하듯", prompt: "본문 문장은 '~해/~이야/~야' 등 친근한 반말로 끝내되 독자를 무시하거나 명령하지 않는다." },
  { value: "한다체", description: "정보글·칼럼의 서술형", prompt: "본문 문장은 '~한다/~이다/~다'의 담담한 서술형으로 끝낸다. 친구에게 말하는 반말이나 명령형 '~해라'와 구분한다." },
] as const;

export const WRITING_STYLES = [
  { value: "default", label: "기본", description: "화자의 개성을 자연스럽게", example: "구매 전 유지비도 함께 확인", prompt: "페르소나의 개성을 살리되 읽기 쉬운 자연스러운 문장을 쓴다." },
  { value: "concise", label: "간결한", description: "짧은 문장·핵심 위주", example: "유지비도 확인", prompt: "한 문장에는 하나의 핵심만 담고 짧게 끊는다. 필요한 조건이나 예외를 생략하지 않고 문장을 나눠 전달한다." },
  { value: "gentle", label: "부드러운", description: "온화하고 부담 없는 표현", example: "선택이 고민된다면 유지비부터 살펴보는 것도 좋은 방법", prompt: "온화하고 다정한 표현을 사용한다. 독자를 재촉하거나 평가하지 않는다. 의무와 주의사항을 임의로 약화하지 않는다." },
  { value: "assertive", label: "힘 있는", description: "명료한 강조·분명한 전달", example: "유지비는 반드시 살펴볼 비교 항목", prompt: "주장과 핵심을 명료하고 힘 있게 전달한다. 위협, 강요, 과장, 근거 없는 확신은 금지한다. 가능성을 확정 사실로 바꾸지 않는다." },
  { value: "plain", label: "담백한", description: "수식어 없이 정보 전달", example: "비교 항목은 가격과 유지비", prompt: "불필요한 수식어, 감탄사, 비유, 광고성 표현을 줄이고 사실과 조건을 담백하게 전달한다." },
  { value: "emotional", label: "감성적인", description: "절제된 비유·이미지 표현", example: "작은 조명 하나가 저녁의 분위기를 바꾸기도", prompt: "절제된 비유와 감각적인 표현, 문장 리듬을 활용한다. 인물의 감정, 실제 경험, 후기나 효능을 지어내지 않는다. 정보의 정확성을 우선한다." },
  { value: "detailed", label: "상세한", description: "맥락·조건을 충분히 설명", example: "사용 시간이 길다면 구매 가격뿐 아니라 매달 발생하는 전기요금도 함께 비교하는 것이 도움", prompt: "조건, 배경, 맥락을 충분히 풀어 설명한다. 문단은 짧게 유지하고 목표 글자수 안에서 설명한다. 분량을 채우려고 내용을 반복하지 않는다." },
  { value: "conversational", label: "대화하듯", description: "말하듯 편안한 문장", example: "가격만 비교하기 쉽지만, 유지비도 놓치기 쉬운 부분", prompt: "말하듯 쉬운 단어와 자연스러운 연결 표현을 사용한다. 독자에게 질문할 수 있으나 가상의 실제 대화나 경험담은 만들지 않는다. 구어체라도 선택된 말끝을 유지한다." },
] as const;

export type WritingTone = (typeof WRITING_TONES)[number]["value"];
export type WritingStyle = (typeof WRITING_STYLES)[number]["value"];

export function isWritingTone(value: unknown): value is WritingTone {
  return WRITING_TONES.some((tone) => tone.value === value);
}

export function isWritingStyle(value: unknown): value is WritingStyle {
  return WRITING_STYLES.some((style) => style.value === value);
}

export function buildWritingStylePrompt(tone: WritingTone, style: WritingStyle): string {
  const toneInfo = WRITING_TONES.find((item) => item.value === tone)!;
  const styleInfo = WRITING_STYLES.find((item) => item.value === style)!;
  return `[회원이 선택한 말끝·문체 — 페르소나의 어조보다 우선 적용]
말끝: ${toneInfo.value}. ${toneInfo.prompt}
문체: ${styleInfo.label}. ${styleInfo.prompt}
페르소나는 관점과 관심사를 결정할 뿐이다. 페르소나에 다른 말끝이나 문체가 지정되어도 위 선택을 우선한다.
실제 사용·방문·구매 경험, 감정, 수치, 출처를 지어내지 않는다. 제공되지 않은 경험은 본인이 경험한 사실처럼 쓰지 않는다.
문체 변경은 표현만 바꾸며 사실·수치·조건·예외·직접 인용·URL·구조화 태그 및 목표 분량은 보존한다.`;
}

export function getWritingStyleExample(tone: WritingTone, style: WritingStyle): string {
  const stem = WRITING_STYLES.find((item) => item.value === style)!.example;
  if (style === "default" || style === "concise") {
    return stem + ({ "해요체": "해요.", "합니다체": "합니다.", "친근한 반말": "해.", "한다체": "한다." }[tone]);
  }
  if (style === "emotional") {
    return stem + ({ "해요체": " 해요.", "합니다체": " 합니다.", "친근한 반말": " 해.", "한다체": " 한다." }[tone]);
  }
  const hasFinalConsonant = (stem.charCodeAt(stem.length - 1) - 0xac00) % 28 !== 0;
  return stem + ({ "해요체": hasFinalConsonant ? "이에요." : "예요.", "합니다체": "입니다.", "친근한 반말": hasFinalConsonant ? "이야." : "야.", "한다체": hasFinalConsonant ? "이다." : "다." }[tone]);
}
