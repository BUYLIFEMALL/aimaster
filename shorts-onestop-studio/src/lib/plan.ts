// 발행 계획·SEO 데이터 구조(서버·화면 공용, P7). 업로드 시간대는 일반적인 시청 시간대를 바탕으로 한 추천값이다(조회수 보장 아님).
import { CATEGORIES, isFormat, type Format } from "@/lib/script";

export const STAGES = {
  start: { label: "채널 시작 (구독 0~100)", guide: "분야 반응을 시험하는 단계. 검색되는 질문형·정보형 주제를 넓게 시험하고, 같은 형식을 반복해 시청 습관을 만든다." },
  seed: { label: "초기 성장 (100~1천)", guide: "반응이 좋았던 주제 축을 2~3개로 좁혀 시리즈화한다. 첫 1초 후킹과 끝까지 보기를 최우선으로 한다." },
  growth: { label: "성장 (1천~1만)", guide: "잘 된 주제의 변형·후속편을 늘리고, 비교·랭킹 같은 공유되는 형식을 섞는다." },
  expand: { label: "확장 (1만~10만)", guide: "인접 분야로 넓히되 채널 정체성을 유지한다. 시즌·트렌드 주제를 계획적으로 배치한다." },
  brand: { label: "브랜딩 (10만 이상)", guide: "채널 고유 시리즈·캐릭터를 강화하고, 긴 영상·커뮤니티로 이어지는 주제를 배치한다." },
  revive: { label: "정체기 돌파", guide: "최근 반응이 떨어진 채널. 후킹 방식·형식을 바꿔 새 시청층을 시험하고, 예전에 잘 된 주제를 새 각도로 다시 다룬다." },
} as const;
export type Stage = keyof typeof STAGES;
export const isStage = (v: unknown): v is Stage => typeof v === "string" && v in STAGES;

/** 분야별 추천 업로드 시각(한국 시간). 하루 편수만큼 앞에서부터 쓴다 */
export const UPLOAD_TIMES: Record<string, string[]> = {
  "건강·운동": ["07:00", "19:00", "12:30"], "자기계발·생산성": ["07:30", "21:00", "12:30"], "돈·재테크": ["08:00", "12:30", "20:00"],
  "요리·레시피": ["11:30", "17:30", "20:30"], "여행": ["20:00", "12:00", "22:00"], "심리·인간관계": ["22:00", "12:30", "20:00"],
  "IT·AI": ["12:30", "20:00", "08:30"], "뷰티·패션": ["20:30", "13:00", "22:00"], "생활 꿀팁": ["12:00", "19:30", "21:30"],
  "동기부여": ["06:30", "22:00", "12:00"], "상식·잡학": ["12:30", "21:30", "18:00"], "운세·꿈풀이": ["07:00", "23:00", "12:00"],
  "미스터리": ["22:30", "21:00", "12:30"], "반전 상식": ["12:30", "20:30", "18:00"],
};
export const MAX_PLAN_TOPICS = 30;

export interface PlanEntry { date: string; time: string; category: string; title: string; hook: string; format: Format | null; projectId?: string; error?: string }
export interface PlanData {
  stage: Stage; perDay: number; days: number; start: string; categories: string[]; seed: string;
  strategy: { summary: string; focus: string[]; tips: string[] };
  entries: PlanEntry[]; model?: string;
}

/** 날짜(YYYY-MM-DD)에 n일 더하기(시간대 영향 없이 UTC로 계산) */
export function addDays(ymd: string, n: number): string {
  const d = new Date(`${ymd}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10);
}

/** AI가 준 주제를 날짜·분야·시각에 순서대로 배치한다(분야는 돌아가며) */
export function buildSchedule(topics: { title: string; hook: string; format: Format | null; category?: string }[], o: { start: string; days: number; perDay: number; categories: string[] }): PlanEntry[] {
  const out: PlanEntry[] = []; let k = 0;
  for (let d = 0; d < o.days; d++) for (let p = 0; p < o.perDay; p++) {
    const t = topics[k]; if (!t) return out;
    const cat = t.category && o.categories.includes(t.category) ? t.category : o.categories[k % o.categories.length];
    out.push({ date: addDays(o.start, d), time: (UPLOAD_TIMES[cat] ?? ["19:00", "12:30", "21:00"])[p] ?? "19:00", category: cat, title: t.title, hook: t.hook, format: t.format });
    k++;
  }
  return out;
}

export function cleanTopics(raw: unknown): { title: string; hook: string; format: Format | null; category?: string }[] {
  return (Array.isArray(raw) ? raw : [])
    .map((t) => (t && typeof t === "object" ? (t as Record<string, unknown>) : {}))
    .map((t) => ({ title: String(t.title ?? "").trim().slice(0, 60), hook: String(t.hook ?? "").trim().slice(0, 40), format: isFormat(t.format) ? t.format : null, category: typeof t.category === "string" && (CATEGORIES as readonly string[]).includes(t.category) ? t.category : undefined }))
    .filter((t) => t.title.length >= 4);
}

/** 업로드 문구(SEO) */
export interface Seo { titles: string[]; description: string; hashtags: string[]; tags: string[]; model?: string }
export function normalizeSeo(raw: Record<string, unknown>, model: string): Seo | null {
  const arr = (v: unknown, n: number, len: number) => (Array.isArray(v) ? v : []).map((x) => String(x ?? "").trim().slice(0, len)).filter(Boolean).slice(0, n);
  const titles = arr(raw.titles, 5, 100);
  const description = String(raw.description ?? "").trim().slice(0, 1500);
  const hashtags = arr(raw.hashtags, 10, 30).map((h) => (h.startsWith("#") ? h : `#${h}`).replace(/\s+/g, ""));
  const tags = arr(raw.tags, 20, 40).map((t) => t.replace(/^#/, ""));
  if (!titles.length || !description) return null;
  return { titles, description, hashtags, tags, model };
}
