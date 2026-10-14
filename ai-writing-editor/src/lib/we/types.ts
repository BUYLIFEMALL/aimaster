// AI 글쓰기 에디터 자동화 — 공통 타입·상수(서버·클라이언트 공용, 비밀 값 없음).

export const FORMATS = [
  { id: "blog", label: "블로그 게시물", hint: "SEO 제목·메타 설명·소제목 구조" },
  { id: "essay", label: "에세이", hint: "1인칭 시선의 생각·경험 글" },
  { id: "email", label: "이메일", hint: "제목과 본문, 인사·맺음 포함" },
  { id: "report", label: "보고서", hint: "요약·배경·본론·결론 구조" },
  { id: "press", label: "보도자료", hint: "헤드라인·리드·본문·회사 소개" },
  { id: "cover", label: "자기소개서", hint: "지원 동기·역량·포부" },
  { id: "product", label: "제품 소개글", hint: "특징·장점·사용 상황" },
  { id: "sns", label: "SNS 게시글", hint: "짧고 읽기 쉬운 문장, 해시태그" },
  { id: "free", label: "자유 형식", hint: "형식 제한 없이" },
] as const;
export type FormatId = (typeof FORMATS)[number]["id"];

export const TONES = [
  { id: "default", label: "기본" },
  { id: "professional", label: "전문적인" },
  { id: "friendly", label: "친근한" },
  { id: "formal", label: "격식 있는" },
] as const;
export type ToneId = (typeof TONES)[number]["id"];

export const LENGTHS = [
  { id: "short", label: "짧게", hint: "500자 안팎" },
  { id: "medium", label: "보통", hint: "1,000~1,500자" },
  { id: "long", label: "길게", hint: "2,500자 이상" },
] as const;
export type LengthId = (typeof LENGTHS)[number]["id"];

export const ACTIONS = [
  { id: "rewrite", label: "다시쓰기" },
  { id: "shorten", label: "짧게" },
  { id: "expand", label: "자세하게" },
  { id: "professional", label: "전문적으로" },
  { id: "friendly", label: "친근하게" },
] as const;
export type ActionId = (typeof ACTIONS)[number]["id"];

export const SUGGESTION_CATEGORIES = ["문법", "표현", "구조", "명확성"] as const;
export type SuggestionCategory = (typeof SUGGESTION_CATEGORIES)[number];

export interface Suggestion {
  originalText: string;
  suggestedText: string;
  reason: string;
  category: SuggestionCategory;
}

export interface Source { uri: string; title: string }

export const LIMITS = {
  prompt: 2000,
  reference: 30_000,
  document: 60_000,
  analyze: 30_000,
  selection: 5_000,
  instruction: 200,
  title: 80,
  maxDocuments: 30,
} as const;

export function isFormat(v: unknown): v is FormatId {
  return typeof v === "string" && FORMATS.some((f) => f.id === v);
}
export function isTone(v: unknown): v is ToneId {
  return typeof v === "string" && TONES.some((t) => t.id === v);
}
export function isLength(v: unknown): v is LengthId {
  return typeof v === "string" && LENGTHS.some((l) => l.id === v);
}
export function isAction(v: unknown): v is ActionId {
  return typeof v === "string" && ACTIONS.some((a) => a.id === v);
}
