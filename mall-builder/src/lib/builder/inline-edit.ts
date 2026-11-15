// 디자인 빌더 D7-2 — 유저 화면 위에서 글자 바로 고치기(node --test 대상, DB 없음)
// 운영사가 유저 화면에서 제목·히어로 문구를 눌러 고치면, 그 값만 첫 화면 「초안」 문서에 덧붙인다.
// 고칠 수 있는 칸은 아래 표뿐(그림·상품·링크·글·HTML은 편집기에서만). 결과는 서버가 validateDoc으로 다시 검사·자른다.
// 화면 쪽 표시: 블록 <section id="blk-<번호>"> 안의 [data-edit-field="<칸>"] (home-slots.tsx)
// 확장자(.ts)까지 적는다 — `node --test`가 이 파일을 바로 읽기 때문

import type { BlocksDoc, BlockType } from "../blocks.ts";

export const INLINE_FIELDS: Partial<Record<BlockType, string[]>> = {
  hero: ["eyebrow", "title", "accent", "text"],
  showcase: ["title"],
  tabs: ["title"],
  timesale: ["title", "subtitle"],
  reviews: ["title"],
  notice: ["title"],
  category_icons: ["title"],
  banner: ["headline", "sub"], // 글 얹은 배너(I14)만 화면에 있음
};

/** 여러 줄을 허용하는 칸(나머지는 한 줄로) */
const MULTILINE = new Set(["hero.text"]);
export const MAX_INLINE_EDITS = 100;

export type InlineEdit = { blockId: string; field: string; value: string };

const oneLine = (s: string) => s.replace(/\s+/g, " ").trim();
const multiLine = (s: string) => s.split("\n").map((l) => l.replace(/[ \t]+/g, " ").trim()).join("\n").replace(/\n{3,}/g, "\n\n").trim();

/** 고친 글자를 초안 문서에 덧붙인다(원본은 그대로). 표에 없는 블록·칸·이상한 값은 건너뛴다 */
export function applyInlineEdits(doc: BlocksDoc, raw: unknown): { doc: BlocksDoc; applied: number; skipped: number } {
  const out: BlocksDoc = JSON.parse(JSON.stringify(doc));
  if (!Array.isArray(raw) || raw.length > MAX_INLINE_EDITS) return { doc: out, applied: 0, skipped: Array.isArray(raw) ? raw.length : 0 };
  let applied = 0;
  let skipped = 0;
  for (const e of raw as Partial<InlineEdit>[]) {
    const block = typeof e?.blockId === "string" ? out.blocks.find((b) => b.id === e.blockId) : undefined;
    const allowed = block ? INLINE_FIELDS[block.type] : undefined;
    if (!block || !allowed || typeof e.field !== "string" || !allowed.includes(e.field) || typeof e.value !== "string") {
      skipped++;
      continue;
    }
    const value = MULTILINE.has(`${block.type}.${e.field}`) ? multiLine(e.value) : oneLine(e.value);
    (block.settings as Record<string, unknown>)[e.field] = value;
    applied++;
  }
  return { doc: out, applied, skipped };
}
