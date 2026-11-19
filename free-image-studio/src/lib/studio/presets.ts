// 용도 프리셋 — 이 프로그램 고유의 그림 설명 틀(다른 프로그램과 공유하지 않는다). 엔진은 영문만 읽으므로 틀도 영문이다.
// 기본 모델 가족은 P0 평가 결과(docs/analysis-free-image-automation-20261119/P0_RESULTS.md 8·11절)를 따른다.

export type PresetId = "photo" | "product" | "thumbnail" | "illustration";

export type Preset = {
  id: PresetId;
  label: string;
  emoji: string;
  hint: string;
  /** 기본 모델 가족(엔진의 family id) */
  family: "z-image-turbo" | "flux2-klein-4b";
  /** {subject} 자리에 사용자가 적은 영문 설명이 들어간다 */
  frame: string;
  /** 설명 칸에 보여 줄 영문 예시 */
  example: string;
};

export const PRESETS: readonly Preset[] = [
  {
    id: "photo",
    label: "실사·블로그",
    emoji: "📷",
    hint: "글 대표 사진처럼 자연스러운 실제 사진 느낌",
    family: "z-image-turbo",
    frame: "{subject}, realistic photograph, natural light, sharp focus, true-to-life colors, no text, no watermark",
    example: "a cozy cafe table with a latte and an open notebook by the window",
  },
  {
    id: "product",
    label: "상품 배경",
    emoji: "🛍",
    hint: "상품을 올려 둘 깔끔한 배경, 가운데는 비워 둠",
    family: "flux2-klein-4b",
    frame: "{subject}, clean product backdrop, empty space in the center for a product, soft studio lighting, uncluttered, no text, no watermark",
    example: "a light marble tabletop with soft green leaves at the edges",
  },
  {
    id: "thumbnail",
    label: "썸네일 구도",
    emoji: "🎬",
    hint: "제목을 얹을 빈 자리가 있는 강한 구도",
    family: "flux2-klein-4b",
    frame: "{subject}, bold eye-catching composition, strong contrast, large empty area on one side for a title, no text, no watermark",
    example: "a surprised chef holding a steaming pot in a bright kitchen",
  },
  {
    id: "illustration",
    label: "일러스트",
    emoji: "🎨",
    hint: "단순한 모양과 부드러운 색의 그림",
    family: "flux2-klein-4b",
    frame: "{subject}, clean flat illustration, simple shapes, soft harmonious colors, no text, no watermark",
    example: "a small house on a hill under a starry night sky",
  },
];

export const findPreset = (id: unknown): Preset | null => PRESETS.find((p) => p.id === id) ?? null;

/** 화면에 보이는 비율 세 가지(엔진 허용 크기와 같은 순서) */
export const SIZE_CHOICES = [
  { id: "wide", label: "가로 16:9", width: 1280, height: 720 },
  { id: "square", label: "정사각 1:1", width: 1024, height: 1024 },
  { id: "tall", label: "세로 9:16", width: 720, height: 1280 },
] as const;
export const findSize = (id: unknown) => SIZE_CHOICES.find((s) => s.id === id) ?? null;

const PERSON = /\b(person|people|man|men|woman|women|girl|boy|child|children|kid|kids|baby|family|couple|student|teacher|worker|chef|doctor|nurse|model|customer|friend|friends|portrait|face|she|he)\b/i;
// 어느 나라·지역 사람인지 이미 적은 설명에는 기본값을 붙이지 않는다(해외 인물·장소를 그리려는 뜻을 바꾸지 않는다).
const ORIGIN =
  /\b(korean?|asian?|japan(ese)?|chin(a|ese)|taiwan(ese)?|vietnam(ese)?|thai(land)?|filipin[oa]|indonesian?|malaysian?|mongolian?|indian?|americ(a|an)|usa|canad(a|ian)|mexic(o|an)|brazil(ian)?|argentin(a|e|ian)|europe(an)?|british|english|scottish|irish|french|france|german(y)?|ital(y|ian)|spanish|spain|portuguese|dutch|swedish|norwegian|danish|finnish|polish|russian?|greek|turk(ey|ish)|arab(ic|ian)?|egypt(ian)?|iran(ian)?|israeli|african?|nigerian?|kenyan?|ethiopian?|australian?|latin[oa]?|hispanic|caucasian|western|foreign(er)?|black|white|blonde)\b/i;

/** 사람이 나오는 설명이고 어느 나라 사람인지 적지 않았으면 한국인으로 그리게 한다(플랫폼 공통 원칙). */
export function withKoreanDefault(subject: string): string {
  return PERSON.test(subject) && !ORIGIN.test(subject) ? `${subject}, Korean people` : subject;
}

/** 프리셋 틀에 사용자 설명을 끼워 엔진에 보낼 영문 설명을 만든다. */
export function buildPrompt(preset: Preset, subject: string): string {
  const clean = subject.replace(/\s+/g, " ").trim().replace(/[.,;\s]+$/, "");
  return preset.frame.replace("{subject}", withKoreanDefault(clean));
}

/** 엔진의 /image-models 응답에서 쓰는 부분 */
export type ModelVariant = { id: string; family: string; status: string; installed?: boolean; recommended?: boolean; familyRecommended?: boolean; tight?: boolean; reason?: string; quant?: string; familyName?: string };
export type ModelState = { recommendedId?: string | null; defaultId?: string | null; installed?: string[]; reason?: string; families?: { id: string; name?: string; variants?: ModelVariant[] }[] };

/**
 * 이 가족에서 쓸 구성 고르기 — 사양 판단은 엔진이 한 것을 그대로 따른다(웹이 사양을 스스로 판단하지 않는다).
 * 순서: 엔진이 이 가족에서 추천한 구성 → 엔진 전체 추천이 이 가족이면 그것 → 받아 둔 구성 가운데 쓸 수 있는 것
 *       → 쓸 수 있는 첫 구성 → 느리지만 되는 첫 구성. 없으면 null(엔진이 정하게 구성 이름을 보내지 않는다).
 */
export function pickVariantId(models: ModelState | null | undefined, family: string): string | null {
  const rows = (models?.families ?? []).find((f) => f.id === family)?.variants ?? [];
  const usable = rows.filter((r) => r && typeof r.id === "string" && r.status !== "unavailable");
  const installed = new Set(models?.installed ?? []);
  return (
    usable.find((r) => r.familyRecommended)?.id ??
    usable.find((r) => r.id === models?.recommendedId)?.id ??
    usable.find((r) => r.status === "available" && installed.has(r.id) && !r.tight)?.id ??
    usable.find((r) => r.status === "available")?.id ??
    usable[0]?.id ??
    null
  );
}
