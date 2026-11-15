// v1.57 메이커 후속 M3-②: 상품 숏폼 「장면 기획」 템플릿 4종 + AI 결과 검증(화면·서버 공용 순수 함수).
// 원칙: AI는 JSON(장면별 문구·사진 번호)만 낸다. 그림은 우리 캔버스(render/scene.ts)가 그린다 — AI가 쓴 HTML/JS는 만들지도 실행하지도 않는다.
// 템플릿 이름·구성·안내 문구는 이 프로그램용으로 새로 정했다(외부 상용 프로그램의 템플릿 이름·안내문·프롬프트를 옮기지 않음).
// 근거: docs/PLAN_20261115_MAKER_M3_PRODUCT_SHORTS_UPGRADE.md §2 1~3단계

import type { ShortsScript } from "./script";

export type TemplateRole = { tag: string; guide: string; photo: boolean };
export type ProductTemplate = {
  label: string; desc: string; seconds: 15 | 30;
  intro: string; cards: TemplateRole[]; outro: string;
  /** 카드 태그 꾸미기(render/scene.ts drawTemplateBadge) */
  motion: "stamp" | "count" | "check" | "shine";
};

/** 기본(v1.44 6비트)은 템플릿 없음(classic). 아래 4종은 v1.57 신규 */
export const PRODUCT_TEMPLATES = {
  pain: {
    label: "😣 고민 → 해결", desc: "시청자의 불편으로 시작해 상품이 해결하는 순간을 보여 줍니다", seconds: 15, motion: "stamp",
    intro: "시청자가 「나도 그래」 하고 멈출 불편을 질문으로 던집니다(상품명은 아직 말하지 않음)",
    cards: [
      { tag: "고민", guide: "상품을 쓰기 전의 불편한 순간 하나(상품 없이)", photo: false },
      { tag: "해결", guide: "상품 등장 — 이름과 한 줄 정체", photo: true },
      { tag: "사용", guide: "실제로 쓰는 모습(판매자가 적은 장점 하나)", photo: true },
      { tag: "결과", guide: "쓰고 난 뒤 달라진 모습(판매자가 적은 사실 범위 안에서)", photo: true },
    ],
    outro: "불편이 풀린 한 줄 + 구매 안내",
  },
  three: {
    label: "3️⃣ 장점 3가지", desc: "판매자가 적은 장점을 하나씩 또렷하게 보여 줍니다", seconds: 30, motion: "count",
    intro: "「이것 하나로 ○가지가 달라집니다」처럼 장점 개수를 예고합니다",
    cards: [
      { tag: "장점 1", guide: "판매자가 적은 장점 1 — 그 장점이 쓸모 있는 순간", photo: true },
      { tag: "장점 2", guide: "판매자가 적은 장점 2(없으면 상품 설명에서 사실 하나)", photo: true },
      { tag: "장점 3", guide: "판매자가 적은 장점 3(없으면 옵션·쓰임새에서 사실 하나)", photo: true },
      { tag: "정리", guide: "세 장점을 한 줄로 묶어 다시 보여 주기", photo: true },
    ],
    outro: "세 장점 요약 한 줄 + 구매 안내",
  },
  proof: {
    label: "🔍 근거로 보여주기", desc: "고르는 기준을 먼저 말하고, 이 상품이 그 기준에 맞는 근거를 보여 줍니다", seconds: 30, motion: "check",
    intro: "「살 때 이것부터 보세요」처럼 고르는 기준을 예고합니다",
    cards: [
      { tag: "기준", guide: "이런 상품을 고를 때 볼 기준 하나(일반적인 내용, 수치 없이)", photo: false },
      { tag: "근거", guide: "이 상품이 그 기준에 맞는 근거 — 판매자가 적은 설명·옵션 원문 그대로", photo: true },
      { tag: "확인", guide: "실제로 쓰는 모습으로 근거를 눈으로 확인", photo: true },
      { tag: "체크", guide: "사기 전에 확인할 점(옵션·쓰임새) 한 가지", photo: true },
    ],
    outro: "기준에 맞는 상품이라는 한 줄 + 구매 안내",
  },
  offer: {
    label: "🎁 혜택 강조", desc: "판매자가 적은 혜택을 처음과 끝에 두 번 보여 줍니다(혜택 칸을 꼭 채워 주세요)", seconds: 15, motion: "shine",
    intro: "판매자가 적은 혜택 문구를 먼저 보여 줍니다(혜택이 없으면 상품의 가장 큰 장점)",
    cards: [
      { tag: "상품", guide: "상품 등장 — 이름과 한 줄 정체", photo: true },
      { tag: "장점", guide: "판매자가 적은 장점 중 가장 눈에 띄는 것", photo: true },
      { tag: "사용", guide: "실제로 쓰는 모습", photo: true },
      { tag: "혜택", guide: "판매자가 적은 혜택 문구를 원문 그대로 다시", photo: true },
    ],
    outro: "혜택 원문 + 구매 안내(cta 첫 줄에 혜택 원문)",
  },
} as const satisfies Record<string, ProductTemplate>;
export type TemplateKey = keyof typeof PRODUCT_TEMPLATES;
export const isTemplate = (v: unknown): v is TemplateKey => typeof v === "string" && v in PRODUCT_TEMPLATES;

/** 대본 프롬프트에 넣는 장면 기획 지시(템플릿 + 사진 번호) */
export function templateGuide(key: TemplateKey, photoCount: number): string {
  const t = PRODUCT_TEMPLATES[key];
  const n = Math.max(0, Math.min(6, Math.floor(photoCount)));
  return [
    `[장면 기획 — 「${t.label.replace(/^\S+\s/, "")}」 구성, 카드 정확히 ${t.cards.length}장]`,
    `- 인트로: ${t.intro}`,
    ...t.cards.map((c, i) => `- 카드${i + 1}(${c.tag}): ${c.guide}`),
    `- 아웃트로: ${t.outro}`,
    n
      ? `- 판매자가 올린 상품 사진은 ${n}장입니다(1~${n}번). 인트로·카드·아웃트로마다 "photo"에 보여 줄 사진 번호(1~${n})를 넣고, 상품이 나오지 않는 장면은 0을 넣으세요. 없는 번호는 쓰지 않습니다.`
      : `- 상품 사진이 없으니 "photo"는 모두 0입니다.`,
  ].join("\n");
}

// ── 검증 ──
export type Issue = { scene: "intro" | "outro" | number | "all"; field: string; msg: string };
/** 화면 글자 한도(프롬프트 한도에 2~4자 여유 — 사소한 초과로 회원 키를 다시 쓰지 않게) */
export const CHECK_LIMITS = { introTitle: 20, eyebrow: 10, cardTitle: 18, desc: 28, cta: 20 } as const;
const BANNED = ["품절 대란", "품절대란", "마감 임박", "마감임박", "한정 수량", "한정수량", "1위", "100%", "백퍼센트", "완치", "부작용 없"];
const NUM_RE = /(\d[\d,]*(?:\.\d+)?)\s*(만|천|억)?\s*(원|%|퍼센트|점|명|건|개|위|배|분|초|시간|일|년|kg|mAh|ml|cm|mm|g|W|L)?/g;

const normNum = (s: string) => s.replace(/,/g, "").replace(/\.0+$/, "");
/** 입력(주제·상품 정보)에 들어 있는 숫자 */
export function inputNumbers(text: string): Set<string> {
  const out = new Set<string>();
  for (const m of text.matchAll(/\d[\d,]*(?:\.\d+)?/g)) out.add(normNum(m[0]));
  return out;
}
/** 입력에 없는 가격·평점·후기 수·수치 주장. 단위 없는 한 자리 수(순서·개수)와 올해 연도는 허용 */
export function inventedNumbers(text: string, allowed: Set<string>, year = new Date().getFullYear()): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(NUM_RE)) {
    const n = normNum(m[1]); const unit = m[3] ?? ""; const mult = m[2] ?? "";
    if (allowed.has(n)) continue;
    if (!unit && !mult && Number(n) < 10) continue;
    if (unit === "년" && n === String(year)) continue;
    if (!unit && !mult && n === String(year)) continue;
    out.push(m[0].trim());
  }
  return out;
}

export type CheckCtx = { template: TemplateKey; photos: number; input: string; budget?: number };
/** 장면 기획 검사: 장면 수·글자 수·없는 사진 번호·입력에 없는 숫자·금지 표현 */
export function checkProductScript(s: ShortsScript, ctx: CheckCtx): Issue[] {
  const t = PRODUCT_TEMPLATES[ctx.template]; const issues: Issue[] = [];
  const allowed = inputNumbers(ctx.input);
  if (s.cards.length !== t.cards.length) issues.push({ scene: "all", field: "cards", msg: `카드가 ${s.cards.length}장입니다(정확히 ${t.cards.length}장).` });
  const len = (scene: Issue["scene"], field: string, v: string, max: number) => { if (v.length > max) issues.push({ scene, field, msg: `${v.length}자 — ${max}자 이내로 줄여 주세요.` }); };
  len("intro", "title", s.intro.title, CHECK_LIMITS.introTitle);
  len("intro", "eyebrow", s.intro.eyebrow, CHECK_LIMITS.eyebrow);
  s.cards.forEach((c, i) => { len(i, "title", c.title, CHECK_LIMITS.cardTitle); len(i, "desc", c.desc, CHECK_LIMITS.desc); });
  s.outro.cta.forEach((c) => len("outro", "cta", c, CHECK_LIMITS.cta));
  if (ctx.budget) {
    const total = [s.intro.narration, ...s.cards.map((c) => c.narration), s.outro.narration].join("").length;
    if (total > ctx.budget * 1.2) issues.push({ scene: "all", field: "narration", msg: `내레이션이 모두 ${total}자로 깁니다(약 ${ctx.budget}자 이내).` });
  }
  const plan = s.photoPlan ?? [];
  plan.forEach((p, i) => {
    if (p < 0 || p > ctx.photos || !Number.isInteger(p)) issues.push({ scene: i === 0 ? "intro" : i === s.cards.length + 1 ? "outro" : i - 1, field: "photo", msg: `없는 사진 번호 ${p}(사진은 ${ctx.photos}장).` });
  });
  const texts: [Issue["scene"], string, string][] = [
    ["intro", "eyebrow", s.intro.eyebrow], ["intro", "title", s.intro.title], ["intro", "narration", s.intro.narration],
    ...s.cards.flatMap((c, i): [Issue["scene"], string, string][] => [[i, "title", c.title], [i, "desc", c.desc], [i, "narration", c.narration]]),
    ["outro", "title", s.outro.title], ["outro", "subtitle", s.outro.subtitle], ["outro", "cta", s.outro.cta.join(" ")], ["outro", "narration", s.outro.narration],
  ];
  for (const [scene, field, v] of texts) {
    const bad = inventedNumbers(v, allowed);
    if (bad.length) issues.push({ scene, field, msg: `입력에 없는 숫자: ${bad.join(", ")} — 판매자가 적은 사실만 써 주세요.` });
    const ban = BANNED.filter((b) => v.includes(b) && !ctx.input.includes(b));
    if (ban.length) issues.push({ scene, field, msg: `근거 없는 과장 표현: ${ban.join(", ")}` });
  }
  return issues;
}

/** 다시 쓰기 요청에 덧붙일 문제 목록 */
export function issuesNote(issues: Issue[]): string {
  const where = (i: Issue) => (i.scene === "intro" ? "인트로" : i.scene === "outro" ? "아웃트로" : i.scene === "all" ? "전체" : `카드${i.scene + 1}`);
  return `\n\n[다시 쓰기] 직전 장면 기획에 아래 문제가 있습니다. 같은 구성을 유지하되 모두 고쳐 JSON으로 다시 쓰세요:\n${issues.slice(0, 12).map((i) => `- ${where(i)} ${i.field}: ${i.msg}`).join("\n")}`;
}

/** 템플릿 결과를 대본에 적용: 카드 태그를 템플릿 역할로 고정, 템플릿 키 기록 */
export function applyTemplate(s: ShortsScript, key: TemplateKey): ShortsScript {
  const t = PRODUCT_TEMPLATES[key];
  return { ...s, template: key, cards: s.cards.map((c, i) => ({ ...c, tag: t.cards[i]?.tag ?? c.tag })) };
}

/** AI가 낸 장면별 사진 번호(인트로·카드·아웃트로 순). 형식이 아니면 undefined */
export function readPhotoPlan(raw: Record<string, unknown>): number[] | undefined {
  const num = (o: unknown) => { const v = Number((o as Record<string, unknown> | null)?.photo); return Number.isFinite(v) ? Math.round(v) : NaN; };
  const cards = Array.isArray(raw.cards) ? raw.cards : [];
  const list = [num(raw.intro), ...cards.map(num), num(raw.outro)];
  return list.every((v) => Number.isNaN(v)) ? undefined : list.map((v) => (Number.isNaN(v) ? 0 : v));
}

/** 화면 표시용: 문제를 장면별로 묶는다 */
export function issuesFor(issues: Issue[] | undefined, scene: Issue["scene"]): Issue[] {
  return (issues ?? []).filter((i) => i.scene === scene);
}
