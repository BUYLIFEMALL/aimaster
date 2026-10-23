import type { Node as PMNode } from "@tiptap/pm/model";

// 서식 에디터(ProseMirror) 문서에서 "텍스트 위치 찾기"를 하는 순수 도우미(DOM 의존 없음, 단위 테스트 대상).
// 분석 제안·선택 수정은 평문(plain text) 기준 문자열을 돌려주므로, 적용 시점에 문서에서 그 문자열의 실제 위치를 다시 찾는다.
// 평문은 에디터의 getText({ blockSeparator: "\n\n" })와 같은 규칙이다: 텍스트 블록 사이는 빈 줄, hard break는 줄바꿈.

/** 줄바꿈(hard break)·이미지 같은 인라인 leaf는 위치 1칸을 차지하므로 같은 길이의 자리표시 문자로 바꿔 인덱스를 1:1로 맞춘다 */
const LEAF = "￼";
const SEP = "\n\n";

export interface TextRange { from: number; to: number }

interface Flat { text: string; pos: number[] }

function blockText(node: PMNode): string {
  return node.textBetween(0, node.content.size, undefined, LEAF);
}

/** 문서의 모든 텍스트 블록을 빈 줄로 이어 붙인 문자열과, 각 글자의 문서 위치 표를 만든다 */
export function flatten(doc: PMNode): Flat {
  const blocks: { node: PMNode; pos: number }[] = [];
  doc.descendants((node, pos) => {
    if (node.isTextblock) { blocks.push({ node, pos }); return false; }
    return true;
  });
  let text = "";
  const pos: number[] = [];
  let prevEnd = 0;
  blocks.forEach((b, bi) => {
    if (bi > 0) for (const ch of SEP) { text += ch; pos.push(prevEnd); }
    const t = blockText(b.node);
    for (let i = 0; i < t.length; i++) { text += t[i]; pos.push(b.pos + 1 + i); }
    prevEnd = b.pos + 1 + t.length;
  });
  return { text, pos };
}

/** 평문 needle을 flatten 문자열과 비교할 수 있는 형태로 바꾼다: 빈 줄은 블록 경계, 단일 줄바꿈은 hard break 자리표시 */
function normalizeNeedle(needle: string): string {
  return needle
    .replace(/\r\n?/g, "\n")
    .replace(/^\n+|\n+$/g, "")
    .replace(/\n{2,}/g, "\u0001")
    .replace(/\n/g, LEAF)
    .replace(/\u0001/g, SEP);
}

/** needle이 들어 있는 모든 위치(여러 블록에 걸친 일치 포함) */
export function findAllText(doc: PMNode, needle: string): TextRange[] {
  const target = normalizeNeedle(needle);
  if (!target.trim()) return [];
  const { text, pos } = flatten(doc);
  const out: TextRange[] = [];
  let from = 0;
  while (from <= text.length) {
    const i = text.indexOf(target, from);
    if (i < 0) break;
    out.push({ from: pos[i], to: pos[i + target.length - 1] + 1 });
    from = i + Math.max(1, target.length);
  }
  return out;
}

/** hint 위치에 가장 가까운 일치 한 곳(없으면 null) */
export function findText(doc: PMNode, needle: string, hint = 0): TextRange | null {
  const all = findAllText(doc, needle);
  if (all.length === 0) return null;
  let best = all[0];
  for (const r of all) if (Math.abs(r.from - hint) < Math.abs(best.from - hint)) best = r;
  return best;
}

/** from~to 사이의 평문(에디터 getText와 같은 규칙: 블록 사이는 빈 줄, hard break는 줄바꿈) */
export function rangeText(doc: PMNode, from: number, to: number): string {
  return doc.textBetween(from, to, SEP, "\n");
}

/** 범위가 둘 이상의 텍스트 블록에 걸쳐 있는가 */
export function spansBlocks(doc: PMNode, range: TextRange): boolean {
  return doc.resolve(range.from).parent !== doc.resolve(range.to).parent;
}

/** 교체할 평문을 문단 단위로 나눈다(빈 줄 기준). 문단 하나면 인라인 교체로 처리한다. */
export function splitParagraphs(text: string): string[] {
  return text.replace(/\r\n?/g, "\n").split(/\n\s*\n/).map((p) => p.trim()).filter((p) => p.length > 0);
}
