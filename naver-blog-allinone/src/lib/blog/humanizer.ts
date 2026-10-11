// 블로그 문장 다듬기(Humanizer): naver-blog-agent 의 humanizer 를 가져왔다.
// 문단 단위로 윤문하되 숫자·URL 이 바뀌면 그 문단의 수정은 버린다(사실 보존 검증).

export const BLOG_HUMANIZER_RULES = `
# 블로그 문장 다듬기 (Humanizer 지침)

원고의 사실 내용을 새로 쓰거나 왜곡하지 마라. 독자가 읽을 때 부자연스럽거나 기계적으로 걸리는 표현만 다듬는다. 이미 자연스럽고 정확한 문단은 그대로 둔다. 수정이 없으면 edits:[]가 정상 결과다.

1. 번역투, 이중 피동, 불필요한 명사화, 알맹이 없는 상투적 강조를 문맥에 맞게 줄인다. ("살펴보겠습니다", "매우 중요합니다", "주목할 만합니다" 등 상투어구 제거)
2. 단순한 동의어 교체나 어순 변주는 하지 않는다. 원문을 이해하는 데 걸림돌이 없으면 유지한다.
3. 원문에 없는 이유·효과·예시·사례·경험·감정·방문 후기·추천을 절대 지어내지 않는다.
4. 기존 해요체·합니다체 등 말투와 전문용어를 유지한다. 자연스러운 단문, 목록, 감탄, 접속사를 억지로 고치지 않는다.
5. 긴 조건 나열, 겹친 명사구 때문에 읽기 어려우면 문단 안에서 조건별 문장을 나누고 주체와 행동을 분명히 한다.
6. 대상, 제외 조건, 지역, 시점, 예외, 부정, 비교, 인과, 의무와 가능성을 100% 보존한다. '지원받을 수 있습니다'를 '지원받습니다'로 바꾸지 않는다.
7. 부분 부정을 전체 부정으로 바꾸지 않는다.
8. 행동 자체도 보존한다. '피한다/제외한다/기다린다/준비한다'를 단지 '확인한다/알아본다'로 바꾸지 않는다.
9. 숫자, 단위, 날짜, 기관·상품·장소·법령 이름, 직접 인용, 링크, 참고자료는 100% 보존한다.
10. 같은 내용을 다시 요약하거나 군더더기를 덧붙이지 않는다.
11. 소제목 표식([SECTION ...]), 이미지 표식([IMAGE INSERT ...]), 목록(-)·인용(>)·강조(**) 표기는 변경하거나 삭제하지 않는다.
12. 연도 표기는 항상 당해 연도 기준을 유지한다. 과거 연도로 잘못 언급된 문맥이 있다면 당해 연도 최신 기준으로 자연스럽게 바로잡는다.

[응답 형식 - 반드시 아래 JSON으로만 응답]
{
  "status": "success",
  "edits": [
    { "id": "b1", "text": "자연스럽게 수정된 해당 문단 전체 내용" }
  ]
}
수정할 문단이 없으면 "edits": [] 로 응답할 것.
`;

export interface HumanizeBlock {
  id: string;
  text: string;
  locked: boolean;
}

/** 글을 문단 단위 블록으로 나눈다(구조 표식·참고자료는 locked 로 보호). 블록을 이어 붙이면 원문과 같다. */
export function splitArticle(article: string): HumanizeBlock[] {
  let inReferences = false;
  return article
    .split(/(\r?\n[\t ]*\r?\n|^\[SECTION[^\r\n]*|^\[IMAGE INSERT[^\r\n]*)/m)
    .filter((text) => text !== "")
    .map((text, i) => {
      if (/^\[SECTION\s*-\s*참고자료\s*\]/i.test(text)) inReferences = true;
      const locked = inReferences || !text.trim() || /^\[(?:SECTION|IMAGE INSERT)\b/i.test(text);
      return { id: "b" + i, text, locked };
    });
}

export function extractSignatures(text: string) {
  return {
    numbers: (text.match(/\d+(?:[.,:/-]\d+)*/g) || []).sort(),
    urls: (text.match(/https?:\/\/[^\s<>]+/g) || []).sort(),
  };
}

export function buildHumanizerUser(blocks: HumanizeBlock[], title: string, category: string): string {
  const payload = JSON.stringify({ title, category, blocks: blocks.map((b) => ({ id: b.id, text: b.text, locked: b.locked })) }, null, 2);
  return `다음 블로그 원고의 각 블록을 읽고, 부자연스럽거나 AI 티가 나는 문단을 사람다운 문체로 다듬어줘.\n(locked: true인 블록은 절대 수정 금지, 숫자가 바뀌지 않도록 주의할 것)\n\n${payload}`;
}

export function applyHumanizerEdits(
  blocks: HumanizeBlock[],
  edits: { id: string; text: string }[]
): { article: string; changes: number } {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const replacements = new Map<string, string>();
  let changes = 0;
  for (const edit of edits) {
    const block = byId.get(edit.id);
    if (!block || block.locked || typeof edit.text !== "string" || !edit.text.trim()) continue;
    const before = extractSignatures(block.text);
    const after = extractSignatures(edit.text);
    if (JSON.stringify(before.numbers) !== JSON.stringify(after.numbers) || JSON.stringify(before.urls) !== JSON.stringify(after.urls)) continue;
    replacements.set(edit.id, edit.text);
    if (edit.text !== block.text) changes++;
  }
  return { article: blocks.map((b) => replacements.get(b.id) ?? b.text).join(""), changes };
}
