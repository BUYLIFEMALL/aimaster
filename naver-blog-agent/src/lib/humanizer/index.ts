import { BLOG_HUMANIZER_RULES } from "./rules";

export interface HumanizeBlock {
  id: string;
  text: string;
  locked: boolean;
}

export interface HumanizeChange {
  id: string;
  before: string;
  after: string;
}

export interface HumanizeResult {
  article: string;
  changes: HumanizeChange[];
}

/**
 * 글을 문단 단위 블록으로 분할 (인용구나 섹션 구분선, 참고자료는 locked: true로 보호)
 */
export function splitArticle(article: string): HumanizeBlock[] {
  let inReferences = false;
  return article
    .split(/(\r?\n[\t ]*\r?\n|^\[SECTION[^\r\n]*|^\[IMAGE INSERT[^\r\n]*)/m)
    .filter((text) => text !== "")
    .map((text, i) => {
      if (/^\[SECTION\s*-\s*참고자료\s*\]/i.test(text)) inReferences = true;
      const locked =
        inReferences ||
        !text.trim() ||
        /^\[(?:SECTION|IMAGE INSERT)\b/i.test(text);
      return { id: "b" + i, text, locked };
    });
}

/**
 * 문단 내 숫자, URL, 인용구 시그니처 추출 (윤문 후 훼손 여부 대조용)
 */
export function extractSignatures(text: string) {
  return {
    numbers: (text.match(/\d+(?:[.,:/-]\d+)*/g) || []).sort(),
    urls: (text.match(/https?:\/\/[^\s<>]+/g) || []).sort(),
  };
}

/**
 * 휴머나이저 LLM 프롬프트 생성
 */
export function buildHumanizerPrompt(article: string, title?: string, category?: string) {
  const blocks = splitArticle(article);
  const editableBlocks = blocks.map((b) => ({
    id: b.id,
    text: b.text,
    locked: b.locked,
  }));

  const userContent = JSON.stringify({
    title: title || "",
    category: category || "",
    blocks: editableBlocks,
  }, null, 2);

  return {
    systemPrompt: BLOG_HUMANIZER_RULES,
    userPrompt: `다음 블로그 원고의 각 블록을 읽고, 부자연스럽거나 AI 티가 나는 문단을 사람다운 문체로 다듬어줘.\n(locked: true인 블록은 절대 수정 금지, 숫자가 바뀌지 않도록 주의할 것)\n\n${userContent}`,
    blocks,
  };
}

/**
 * LLM 윤문 결과를 원고에 적용 및 팩트 보존 검증
 */
export function applyHumanizerEdits(
  blocks: HumanizeBlock[],
  edits: { id: string; text: string }[]
): HumanizeResult {
  const byId = new Map(blocks.map((b) => [b.id, b]));
  const replacements = new Map<string, string>();
  const changes: HumanizeChange[] = [];

  for (const edit of edits) {
    const block = byId.get(edit.id);
    if (!block || block.locked || typeof edit.text !== "string" || !edit.text.trim()) {
      continue;
    }

    // 숫자 보존 검증: 원래 숫자가 임의로 바뀌었으면 원본 유지
    const sigBefore = extractSignatures(block.text);
    const sigAfter = extractSignatures(edit.text);
    if (JSON.stringify(sigBefore.numbers) !== JSON.stringify(sigAfter.numbers)) {
      // 숫자 왜곡 발견 시 윤문 취소하고 원본 유지
      continue;
    }

    replacements.set(edit.id, edit.text);
    if (edit.text !== block.text) {
      changes.push({ id: edit.id, before: block.text, after: edit.text });
    }
  }

  const finalArticle = blocks
    .map((b) => replacements.get(b.id) ?? b.text)
    .join("");

  return { article: finalArticle, changes };
}
