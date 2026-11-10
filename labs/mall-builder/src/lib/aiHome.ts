// D29 AI 첫 화면 자동 구성 — 응답 형식·프롬프트·블록 바꾸기(node --test 대상, DB·SDK 없음)
// AI는 그림이 필요 없는 블록만 고른다(띠 문구·쇼윈도·탭 상품·카테고리 바로가기·구매 후기·공지). 등록표 검사를 통과한 블록만 편집기에 올린다.
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import { z } from "zod";
import { BLOCK_DEFS, newBlock, type Block, type BlockType } from "./blocks.ts";

export const AI_HOME_TYPES = ["topbar", "showcase", "tabs", "category_icons", "reviews", "notice"] as const;
export type AiHomeType = (typeof AI_HOME_TYPES)[number];
export const MAX_AI_BLOCKS = 8;

export const HomeDraftSchema = z.object({
  blocks: z
    .array(
      z.object({
        type: z.enum(AI_HOME_TYPES),
        title: z.string().describe("블록 제목(띠 배너는 빈 글자)"),
        texts: z.array(z.string()).describe("띠 배너 문구 1~3줄(다른 블록은 빈 배열)"),
        source: z.enum(["new", "category"]).describe("쇼윈도 상품: 신상품 또는 카테고리"),
        category_ids: z.array(z.string()).describe("쓰는 카테고리 id(목록에 있는 것만). 쇼윈도는 1개, 탭은 탭마다 1개, 바로가기는 2~8개"),
        labels: z.array(z.string()).describe("탭 이름(탭 상품만, category_ids와 같은 순서)"),
        emojis: z.array(z.string()).describe("카테고리 바로가기 이모지(category_ids와 같은 순서)"),
      }),
    )
    .describe("위에서부터 놓일 블록 3~8개"),
  note: z.string().describe("이렇게 구성한 이유 한두 문장"),
});
export type HomeDraft = z.infer<typeof HomeDraftSchema>;

export type HomeFacts = { storeName: string; industry: string; categories: { id: string; name: string }[]; productNames: string[]; productCount: number; hasReviews: boolean; hasNotices: boolean };

export function buildHomePrompt(f: HomeFacts, year: number) {
  const system = [
    "당신은 한국 온라인 쇼핑몰의 첫 화면 기획자입니다. 정해진 블록 종류만으로 첫 화면 위쪽 배치 초안을 만듭니다.",
    `[기준 연도 엄수: 현재 연도는 ${year}년입니다. 연도·시즌 문구는 ${year}년 기준으로 씁니다.]`,
    "쓸 수 있는 블록: topbar(맨 위 띠 문구 1~3줄, 한 줄 40자 이내) · showcase(상품 묶음: 신상품 또는 카테고리 1개) · tabs(탭 2~4개, 탭마다 카테고리 1개) · category_icons(카테고리 바로가기 2~8개, 이모지 1개씩) · reviews(구매 후기) · notice(공지).",
    "카테고리 id는 아래 목록에 있는 것만 그대로 씁니다. 후기가 없으면 reviews를, 공지가 없으면 notice를 넣지 않습니다. 같은 종류는 2번까지.",
    "할인율·기한·무료배송 같은 사실은 지어내지 말고, 띠 문구는 업종에 맞는 일반 안내(예: 사업자 회원 가입 안내, 대량 구매 견적 안내)로 씁니다.",
    "블록은 3~8개. 제목은 20자 이내 한국어.",
  ].join("\n");
  const user = [
    `쇼핑몰: ${f.storeName}`,
    `업종·분위기(운영자 입력): ${f.industry.slice(0, 200)}`,
    `상품 수: ${f.productCount}개${f.productNames.length ? ` · 예: ${f.productNames.slice(0, 20).join(", ")}` : ""}`,
    `카테고리(id: 이름):\n${f.categories.slice(0, 40).map((c) => `${c.id}: ${c.name}`).join("\n") || "(없음)"}`,
    `후기 ${f.hasReviews ? "있음" : "없음"} · 공지 ${f.hasNotices ? "있음" : "없음"}`,
  ].join("\n");
  return { system, user };
}

/** AI 초안 → 등록표 검사를 통과한 블록만. 버린 수도 함께 */
export function draftToBlocks(d: HomeDraft, f: Pick<HomeFacts, "categories" | "hasReviews" | "hasNotices">, idOf: (i: number) => string = (i) => `ai${Date.now().toString(36)}${i}`): { blocks: Block[]; dropped: number } {
  const known = new Set(f.categories.map((c) => c.id));
  const cats = (ids: string[]) => [...new Set(ids.filter((id) => known.has(id)))];
  const blocks: Block[] = [];
  let dropped = 0;
  const count = new Map<string, number>();
  for (const [i, b] of (d.blocks ?? []).entries()) {
    if (blocks.length >= MAX_AI_BLOCKS) { dropped++; continue; }
    if (!AI_HOME_TYPES.includes(b.type) || (count.get(b.type) ?? 0) >= 2) { dropped++; continue; }
    if ((b.type === "reviews" && !f.hasReviews) || (b.type === "notice" && !f.hasNotices)) { dropped++; continue; }
    const base = newBlock(b.type as BlockType, idOf(i));
    const def = base.settings as Record<string, unknown>;
    const title = (b.title ?? "").trim().slice(0, 40);
    let settings: unknown;
    if (b.type === "topbar") {
      settings = { ...def, items: (b.texts ?? []).map((t) => t.trim().slice(0, 60)).filter(Boolean).slice(0, 3).map((text) => ({ text, link: "", bg: "#111827" })) };
    } else if (b.type === "showcase") {
      const c = cats(b.category_ids ?? [])[0];
      settings = { ...def, title: title || def.title, source: b.source === "category" && c ? "category" : "new", category_id: b.source === "category" && c ? c : "" };
    } else if (b.type === "tabs") {
      const ids = cats(b.category_ids ?? []).slice(0, 5);
      const tabs = ids.map((id, j) => ({ label: (b.labels?.[(b.category_ids ?? []).indexOf(id)] ?? f.categories.find((c) => c.id === id)?.name ?? `탭 ${j + 1}`).trim().slice(0, 20), source: "category", category_id: id, product_ids: [] }));
      settings = { ...def, title, tabs };
    } else if (b.type === "category_icons") {
      const ids = cats(b.category_ids ?? []).slice(0, 12);
      settings = { ...def, title, items: ids.map((id) => ({ category_id: id, image: "", emoji: [...(b.emojis?.[(b.category_ids ?? []).indexOf(id)] ?? "")].slice(0, 2).join("") })) };
    } else {
      settings = { ...def, title: title || def.title };
    }
    const v = BLOCK_DEFS[b.type as BlockType].validate(settings);
    if (!v.ok) { dropped++; continue; }
    blocks.push({ ...base, settings: v.value } as Block);
    count.set(b.type, (count.get(b.type) ?? 0) + 1);
  }
  return { blocks, dropped };
}
