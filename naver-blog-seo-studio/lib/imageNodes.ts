// BLC-10 (2026-10-22): 본문 이미지 노드 규칙 — 순수 함수(서버·화면 공용, 시험에서 바로 import).
// 노드 = seo_report.contentImages의 한 항목. 칸 번호(content-1~3)가 노드 번호라 확장·자동 발행은 그대로 쓴다.
// 노드 하나를 바꿀 때 다른 노드와 블록 위치는 건드리지 않는다.

export const IMAGE_SLOTS = ["content-1", "content-2", "content-3"] as const;
export type ImageSlot = typeof IMAGE_SLOTS[number];
export type ImageNode = { slot: ImageSlot; sentence: string; prompt?: string; request?: string; path?: string; mimeType?: string; model?: string };
export type NodeBlock =
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; slot: "cover" | ImageSlot; alt: string };

export const isImageSlot = (value: unknown): value is ImageSlot => IMAGE_SLOTS.some((slot) => slot === value);

export function freeSlots(nodes: ImageNode[]): ImageSlot[] {
  return IMAGE_SLOTS.filter((slot) => !nodes.some((node) => node.slot === slot));
}

// 같은 칸이면 교체, 없으면 추가. 칸 번호 순서로 정렬.
export function upsertNode(nodes: ImageNode[], node: ImageNode): ImageNode[] {
  const rest = nodes.filter((item) => item.slot !== node.slot);
  return [...rest, node].sort((a, b) => IMAGE_SLOTS.indexOf(a.slot) - IMAGE_SLOTS.indexOf(b.slot));
}

export function removeNode(nodes: ImageNode[], slot: ImageSlot): ImageNode[] {
  return nodes.filter((node) => node.slot !== slot);
}

const squash = (value: string) => value.replace(/\s+/g, " ").trim();

function nextTextId(blocks: NodeBlock[]) {
  const used = new Set(blocks.map((block) => block.id));
  let n = blocks.length + 1;
  while (used.has(`text-${n}`)) n += 1;
  return `text-${n}`;
}

// 노드의 이미지 블록을 넣는다. 이미 있으면 그대로(위치 유지).
// beforeBlockId가 있으면 그 블록 바로 앞, 없으면 기준 문장이 든 문단 앞(글 블록을 문단 경계에서 나눔). 못 찾으면 그대로.
export function placeNodeBlock(blocks: NodeBlock[], node: Pick<ImageNode, "slot" | "sentence">, beforeBlockId?: string): NodeBlock[] {
  if (blocks.some((block) => block.type === "image" && block.slot === node.slot)) return blocks;
  const imageBlock: NodeBlock = { id: node.slot, type: "image", slot: node.slot, alt: node.sentence };
  if (beforeBlockId) {
    const index = blocks.findIndex((block) => block.id === beforeBlockId);
    return index < 0 ? blocks : [...blocks.slice(0, index), imageBlock, ...blocks.slice(index)];
  }
  const target = squash(node.sentence);
  if (!target) return blocks;
  const index = blocks.findIndex((block) => block.type === "text" && squash(block.text).includes(target));
  if (index < 0) return blocks;
  const block = blocks[index] as Extract<NodeBlock, { type: "text" }>;
  const paragraphs = block.text.split(/\n\s*\n/);
  const at = paragraphs.findIndex((paragraph) => squash(paragraph).includes(target));
  if (at <= 0) return [...blocks.slice(0, index), imageBlock, ...blocks.slice(index)];
  const before: NodeBlock = { ...block, text: paragraphs.slice(0, at).join("\n\n") };
  const after: NodeBlock = { id: nextTextId(blocks), type: "text", text: paragraphs.slice(at).join("\n\n") };
  return [...blocks.slice(0, index), before, imageBlock, after, ...blocks.slice(index + 1)];
}

const paragraphsOf = (text: string) => text.split(/\n\s*\n/).map((paragraph) => paragraph.trim()).filter(Boolean);

// v2.00: 글 블록을 문단 하나씩으로 나눈다(「여기에 이미지」가 정확히 그 문단 앞에 들어가게). 첫 조각은 원래 id 유지.
export function splitParagraphBlocks<B extends NodeBlock>(blocks: B[]): B[] {
  const used = new Set(blocks.map((block) => block.id));
  let n = 1;
  const freshId = () => { while (used.has(`text-${n}`)) n += 1; used.add(`text-${n}`); return `text-${n}`; };
  return blocks.flatMap((block) => {
    if (block.type !== "text") return [block];
    const parts = paragraphsOf(block.text);
    if (parts.length <= 1) return [block];
    return parts.map((text, index) => ({ ...block, id: index === 0 ? block.id : freshId(), text }));
  });
}

// v2.00: 통짜 본문 입력칸으로 본문이 바뀐 뒤 저장할 때 — 문단마다 글 블록을 새로 만들고, 이미지는 예전 「바로 뒤 문단」을 새 본문에서 찾아 그 앞에 둔다.
// 못 찾으면 그 노드의 기준 문장이 든 문단 앞, 그것도 없으면 예전 순서 자리(앞에 있던 문단 수). 이미지를 빼지 않는다.
export function reflowBlocks(oldBlocks: NodeBlock[], newBody: string, nodes: Pick<ImageNode, "slot" | "sentence">[] = []): NodeBlock[] {
  const paragraphs = paragraphsOf(newBody);
  const keys = paragraphs.map(squash);
  const old = splitParagraphBlocks(oldBlocks);
  const findAt = (text: string) => {
    const key = squash(text);
    if (!key) return -1;
    const exact = keys.indexOf(key);
    if (exact >= 0) return exact;
    const head = key.slice(0, 30);
    return head.length >= 10 ? keys.findIndex((item) => item.startsWith(head)) : -1;
  };
  const placed: { at: number; block: NodeBlock }[] = [];
  let textBefore = 0;
  old.forEach((block, index) => {
    if (block.type === "text") { textBefore += 1; return; }
    const next = old.slice(index + 1).find((item) => item.type === "text") as Extract<NodeBlock, { type: "text" }> | undefined;
    let at = next ? findAt(next.text) : paragraphs.length;
    if (at < 0) {
      const sentence = squash(nodes.find((node) => node.slot === block.slot)?.sentence ?? "");
      at = sentence ? keys.findIndex((item) => item.includes(sentence)) : -1;
    }
    if (at < 0) at = Math.min(textBefore, paragraphs.length);
    placed.push({ at, block });
  });
  const result: NodeBlock[] = [];
  for (let i = 0; i <= paragraphs.length; i += 1) {
    for (const item of placed) if (item.at === i) result.push(item.block);
    if (i < paragraphs.length) result.push({ id: `text-${i + 1}`, type: "text", text: paragraphs[i] });
  }
  return result;
}

export function removeNodeBlock(blocks: NodeBlock[], slot: ImageSlot): NodeBlock[] {
  return blocks.filter((block) => !(block.type === "image" && block.slot === slot));
}

// 회원이 덧붙이는 요청(한국어 그대로) — 저장된 장면 설명은 그대로 두고 뒤에 붙인다.
export function cleanRequest(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 200) : "";
}

export function nodePrompt(prompt: string, request?: string): string {
  return request ? `${prompt} Additional request from the blog author (Korean, follow it within the same single scene): ${request}` : prompt;
}
