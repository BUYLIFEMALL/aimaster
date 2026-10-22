// v1.35 참고 자료 안 레퍼런스 쇼츠 블록 — 머리말 만들기(「출처: ○○」), 블록 목록(출처·대사 글자 수), 블록 하나 빼기
// 다른 파일을 가져오지 않는 순수 함수(node --test로 바로 시험) — REF_MARK는 reference.ts와 같은 값(tests/refBlocks.test.ts가 확인)
export const REF_MARK = "[레퍼런스 쇼츠 대본";

/** 레퍼런스 블록 머리말(앞부분 REF_MARK는 베끼기 검사 표시라 그대로 둔다) */
export function refBlockHeader(source: string): string {
  return `${REF_MARK} — 출처: ${source} · 실제로 말한 내용, 그대로 베끼지 말고 구성·후킹만 참고]`;
}

export type RefBlockInfo = { source: string; chars: number };

const parts = (reference: string) => reference.split(/\n\n(?=\[)/);
const isRef = (b: string) => b.trimStart().startsWith(REF_MARK);

/** 머리말에서 출처 이름 — 새 형식 「출처: ○○ ·」, v1.29~v1.34 형식 「「○○(에서 넘겨받은 레퍼런스 쇼츠)」에서」 */
function sourceOf(header: string): string {
  const now = header.match(/출처: (.+?) · /);
  if (now) return now[1];
  const old = header.match(/「(.+?)」에서 실제로/);
  if (!old) return "";
  return old[1].replace(/에서 넘겨받은 레퍼런스 쇼츠$/, "");
}

/** 참고 자료 안 레퍼런스 블록들(나온 순서대로) */
export function refBlocks(reference: string): RefBlockInfo[] {
  return parts(reference)
    .filter(isRef)
    .map((b) => {
      const [header, ...body] = b.trimStart().split("\n");
      const source = sourceOf(header);
      return { source: source === "넘겨받은 레퍼런스 쇼츠" ? "" : source, chars: body.join("\n").trim().length };
    });
}

/** n번째 레퍼런스 블록만 빼고 나머지(회원 메모·다른 블록)는 그대로 */
export function removeRefBlock(reference: string, n: number): string {
  let i = -1;
  return parts(reference)
    .filter((b) => !(isRef(b) && ++i === n))
    .join("\n\n")
    .trim();
}
