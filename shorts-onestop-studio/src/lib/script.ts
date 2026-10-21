// 쇼츠 대본 데이터 구조·선택지(서버·화면 공용). 원본 프로그램 코드가 아니라 우리 구조로 새로 정의한다.
export const CATEGORIES = [
  "건강·운동", "자기계발·생산성", "돈·재테크", "요리·레시피", "여행", "심리·인간관계", "IT·AI",
  "뷰티·패션", "생활 꿀팁", "동기부여", "상식·잡학", "운세·꿈풀이", "미스터리", "반전 상식",
] as const;
export type Category = (typeof CATEGORIES)[number];

export const TONES = {
  friendly: { label: "친근하게", guide: "친구에게 말하듯 따뜻하고 부드러운 존댓말" },
  expert: { label: "전문가처럼", guide: "근거를 짚어 주는 신뢰감 있는 정보 전달, 군더더기 없이" },
  emotional: { label: "감성적으로", guide: "공감과 여운을 주는 감성적인 표현" },
  funny: { label: "유쾌하게", guide: "가볍고 위트 있는 표현, 부담 없는 웃음 포인트" },
  energetic: { label: "힘차게", guide: "행동을 끌어내는 힘 있고 짧은 문장" },
} as const;
export type Tone = keyof typeof TONES;

export const FORMATS = {
  list: { label: "TOP N 리스트", guide: "번호를 붙인 핵심 항목 나열. 카드 한 장 = 항목 하나" },
  howto: { label: "단계별 방법", guide: "따라 하기 쉬운 순서. 카드 한 장 = 한 단계" },
  tips: { label: "꿀팁 모음", guide: "몰랐던 실용 팁 위주. 카드마다 바로 써먹을 팁 하나" },
  compare: { label: "비교·대결", guide: "두 선택지나 전후를 대비. 카드마다 비교 기준 하나" },
  story: { label: "스토리", guide: "발단→전개→반전→결말로 이어지는 한 편의 이야기. 카드가 순서대로 이어져야 함" },
} as const;
export type Format = keyof typeof FORMATS;

export const MIN_CARDS = 3, MAX_CARDS = 8;

/** 장면 배경(P4). 스톡은 원본 주소(브라우저가 바로 불러옴, CORS 허용 확인), AI 이미지는 저장소 경로(path) + 임시 서명 주소(src) */
/** stockId: 스톡 원본 번호. Pixabay 사진 주소(pixabay.com/get/…)는 24시간 임시라, 열 때마다 이 번호로 새 주소를 받는다(/api/stock/resolve) */
/** v1.23 AI 영상: type "video" + source "ai" + path(회원 폴더 mp4), model = 만든 영상 모델, poster = 첫 화면으로 쓴 사진 배경(썸네일·되돌리기용),
 *  videoJob = 업체에서 만드는 중인 작업(제출 번호 — 저장해 두면 새로고침 뒤에도 이어서 확인). 완성되면 videoJob은 지운다 */
export interface Bg { type: "image" | "video"; source: "pexels" | "pixabay" | "ai"; src: string; thumb?: string; path?: string; credit?: string; pageUrl?: string; prompt?: string; stockId?: string; model?: string; poster?: Bg; videoJob?: import("@/lib/videoModels").VideoJob }
export interface Backdrop { mode: "theme" | "global" | "scene"; global?: Bg; dim: number; style: string; character: string; provider?: "pexels" | "pixabay"; media?: "image" | "video"; hints?: { query: string; prompt: string }[] }
/** 장면 내레이션 음성(P5): 저장소 경로·재생 길이(초)·만들 때의 내레이션(바뀌면 다시 만들어야 함) */
/** words(v1.27): 대본 낱말(공백 기준)마다 음성 속 시작 시각(초) — 있으면 자막을 말하는 순간에 맞춘다 */
export interface Voice { path: string; dur: number; text: string; words?: number[] }
export interface Scene { title: string; desc: string; narration: string; tag?: string; bg?: Bg; voice?: Voice }
export interface ShortsScript {
  topic: string;
  category: string;
  tone: Tone;
  format: Format;
  intro: { eyebrow: string; title: string; narration: string; bg?: Bg; voice?: Voice };
  cards: Scene[];
  outro: { title: string; subtitle: string; cta: string[]; narration: string; bg?: Bg; voice?: Voice };
  hashtags: string[];
  source: "ai" | "manual";
  model?: string;
  /** 장면 디자인(P3) — src/lib/render/scene.ts normalizeDesign()으로 읽는다 */
  design?: { theme?: string; layout?: string; font?: string; effect?: string; badges?: boolean };
  /** 배경 설정(P4) */
  backdrop?: Backdrop;
  /** 음성·자막·배경음악 설정(P5) — src/lib/voice.ts normalizeAudio()로 읽는다 */
  audio?: Partial<import("@/lib/voice").AudioSettings>;
  /** 업로드 문구(P7) — src/lib/plan.ts Seo */
  seo?: import("@/lib/plan").Seo;
  /** 유튜브에 올린 기록(v1.19, 최근 것이 앞, 최대 10개) — 영상 파일은 저장하지 않는다 */
  youtube?: YoutubeUpload[];
}
export interface YoutubeUpload { videoId: string; url: string; title: string; privacy: "private" | "unlisted" | "public"; publishAt?: string | null; channel?: string | null; uploadedAt: string }

export function isTone(v: unknown): v is Tone { return typeof v === "string" && v in TONES; }
export function isFormat(v: unknown): v is Format { return typeof v === "string" && v in FORMATS; }
export function clampCards(n: unknown): number {
  const v = Math.round(Number(n)); return Number.isFinite(v) ? Math.min(MAX_CARDS, Math.max(MIN_CARDS, v)) : 5;
}

/** 주제 문구에서 형식·카드 수를 추측한다(회원이 직접 바꾸면 그 값을 유지) */
export function guessFromTopic(topic: string): { format?: Format; cards?: number; tone?: Tone } {
  const t = topic.replace(/\s+/g, " ");
  const n = t.match(/(\d+)\s*(가지|개|곳|단계|선|위|TOP)/i) ?? t.match(/TOP\s*(\d+)/i);
  const out: { format?: Format; cards?: number; tone?: Tone } = {};
  if (n) out.cards = clampCards(n[1]);
  if (/썰|사연|실화|이야기|반전|복수|미스터리/.test(t)) { out.format = "story"; out.tone = "emotional"; }
  else if (/비교|vs|VS|차이|어느 쪽|뭐가 나을/.test(t)) out.format = "compare";
  else if (/하는\s?법|방법|단계|순서|따라/.test(t)) out.format = "howto";
  else if (/꿀팁|비법|노하우|팁/.test(t)) out.format = "tips";
  else if (n) out.format = "list";
  return out;
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** AI JSON을 우리 구조로 정리한다. 필수 값이 없으면 null */
export function normalizeScript(raw: Record<string, unknown>, base: { topic: string; category: string; tone: Tone; format: Format; cards: number; model: string }): ShortsScript | null {
  const intro = (raw.intro ?? {}) as Record<string, unknown>;
  const outro = (raw.outro ?? {}) as Record<string, unknown>;
  const cards = (Array.isArray(raw.cards) ? raw.cards : [])
    .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>) : {}))
    .map((c) => ({ tag: str(c.tag, 20), title: str(c.title, 40), desc: str(c.desc, 60), narration: str(c.narration, 400) }))
    .filter((c) => c.title && c.narration)
    .slice(0, MAX_CARDS);
  const introTitle = str(intro.title, 50);
  if (!introTitle || cards.length < MIN_CARDS) return null;
  const tags = (Array.isArray(raw.hashtags) ? raw.hashtags : []).map((h) => str(h, 30).replace(/^#?/, "#").replace(/\s+/g, "")).filter((h) => h.length > 1).slice(0, 10);
  return {
    topic: base.topic, category: base.category, tone: base.tone, format: base.format,
    intro: { eyebrow: str(intro.eyebrow, 30), title: introTitle, narration: str(intro.narration, 400) || introTitle },
    cards,
    outro: {
      title: str(outro.title, 50) || "끝까지 봐 주셔서 감사합니다",
      subtitle: str(outro.subtitle, 80),
      cta: (Array.isArray(outro.cta) ? outro.cta : []).map((c) => str(c, 30)).filter(Boolean).slice(0, 3),
      narration: str(outro.narration, 400) || str(outro.title, 50) || "도움이 됐다면 구독과 좋아요 부탁드립니다.",
    },
    hashtags: tags,
    source: "ai",
    model: base.model,
  };
}

/** 내 대본(한 줄 = 한 장면)을 장면 구조로 바꾼다 — AI를 쓰지 않는다 */
export function scriptFromLines(text: string, o: { topic: string; firstAsIntro: boolean; lastAsOutro: boolean }): ShortsScript | null {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, MAX_CARDS + 2);
  const head = o.firstAsIntro ? lines.shift() : undefined;
  const tail = o.lastAsOutro && lines.length > MIN_CARDS ? lines.pop() : undefined;
  if (lines.length < MIN_CARDS) return null;
  const short = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
  return {
    topic: o.topic || short(head ?? lines[0], 40), category: "", tone: "friendly", format: "story",
    intro: { eyebrow: "", title: short(head ?? o.topic ?? lines[0], 40), narration: head ?? short(o.topic || lines[0], 80) },
    cards: lines.slice(0, MAX_CARDS).map((l) => ({ title: short(l, 24), desc: "", narration: l })),
    outro: { title: short(tail ?? "끝까지 봐 주셔서 감사합니다", 40), subtitle: "", cta: [], narration: tail ?? "끝까지 봐 주셔서 감사합니다." },
    hashtags: [], source: "manual",
  };
}

// ── 배경(P4) ──
export const IMAGE_STYLES = {
  photo: { label: "실사 사진", prompt: "photorealistic photograph, natural light, shallow depth of field, high detail" },
  cinematic: { label: "시네마틱", prompt: "cinematic film still, dramatic lighting, rich color grading, 35mm" },
  webtoon: { label: "웹툰", prompt: "Korean webtoon illustration style, clean line art, soft cel shading" },
  anime3d: { label: "3D 애니메이션", prompt: "3D animated movie style, soft global illumination, cute stylized characters" },
  anime2d: { label: "2D 애니메이션", prompt: "2D anime style, vibrant colors, detailed background art" },
  watercolor: { label: "수채화", prompt: "soft watercolor painting, gentle textures, pastel tones" },
  flat: { label: "미니멀 일러스트", prompt: "minimal flat vector illustration, simple shapes, bold colors" },
} as const;
export type ImageStyle = keyof typeof IMAGE_STYLES;
export const DEFAULT_BACKDROP: Backdrop = { mode: "theme", dim: 0.45, style: "photo", character: "" };
export function normalizeBackdrop(b: Partial<Backdrop> | undefined): Backdrop {
  return {
    mode: b?.mode === "global" || b?.mode === "scene" ? b.mode : "theme",
    global: b?.global, dim: typeof b?.dim === "number" ? Math.min(0.85, Math.max(0, b.dim)) : DEFAULT_BACKDROP.dim,
    style: b?.style && b.style in IMAGE_STYLES ? b.style : "photo", character: typeof b?.character === "string" ? b.character.slice(0, 300) : "",
    // 2026-10-16 Pexels 새 키 발급 일시 중단 → 기본은 Pixabay
    provider: b?.provider === "pexels" ? "pexels" : "pixabay", media: b?.media === "image" ? "image" : "video",
    hints: Array.isArray(b?.hints) ? b.hints.slice(0, 12).map((h) => ({ query: String(h?.query ?? "").slice(0, 80), prompt: String(h?.prompt ?? "").slice(0, 900) })) : [],
  };
}
/** 장면 순서대로(인트로·카드…·아웃트로) 배경을 꺼낸다 */
export function sceneBgs(s: ShortsScript): (Bg | undefined)[] { return [s.intro.bg, ...s.cards.map((c) => c.bg), s.outro.bg]; }

/** 장면 순서대로 [내레이션, 음성] — 음성이 지금 내레이션과 같을 때만 유효 */
export function sceneVoices(s: ShortsScript): { text: string; voice?: Voice }[] {
  const all = [{ text: s.intro.narration, voice: s.intro.voice }, ...s.cards.map((c) => ({ text: c.narration, voice: c.voice })), { text: s.outro.narration, voice: s.outro.voice }];
  return all.map((x) => ({ text: x.text, voice: x.voice && x.voice.text === x.text && x.voice.dur > 0 ? x.voice : undefined }));
}
