import type { Node as PMNode } from "@tiptap/pm/model";

// 서식 에디터(ProseMirror) 문서에서 "텍스트 위치 찾기"를 하는 순수 도우미(DOM 의존 없음, 단위 테스트 대상).
// 분석 제안·선택 수정은 평문(plain text) 기준 문자열을 돌려주므로, 적용 시점에 문서에서 그 문자열의 실제 위치를 다시 찾는다.

/** 줄바꿈(hard break)·이미지 같은 인라인 leaf는 위치 1칸을 차지하므로 같은 길이의 자리표시 문자로 바꿔 인덱스를 1:1로 맞춘다 */
const LEAF = "￼";

export interface TextRange { from: number; to: number }

function blockText(node: PMNode): string {
  return node.textBetween(0, node.content.size, undefined, LEAF);
}

/**
 * 문서에서 needle이 들어 있는 모든 위치를 찾는다(한 텍스트 블록 안에서만 일치).
 * needle의 줄바꿈은 hard break 자리표시로 간주한다. 서식(굵게·기울임 등)으로 텍스트 노드가 나뉘어 있어도 이어서 찾는다.
 */
export function findAllText(doc: PMNode, needle: string): TextRange[] {
  const target = needle.replace(/\r?\n/g, LEAF);
  if (!target.trim()) return [];
  const out: TextRange[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const text = blockText(node);
    let from = 0;
    while (from <= text.length) {
      const i = text.indexOf(target, from);
      if (i < 0) break;
      const start = pos + 1 + i;
      out.push({ from: start, to: start + target.length });
      from = i + Math.max(1, target.length);
    }
    return false; // 텍스트 블록 내부는 이미 읽었다
  });
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

/** from~to 사이의 평문(블록 사이는 줄바꿈, hard break는 줄바꿈으로 되돌림) */
export function rangeText(doc: PMNode, from: number, to: number): string {
  return doc.textBetween(from, to, "\n", "\n");
}
