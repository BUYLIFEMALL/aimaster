import {
  CHUNK_SIZE,
  MAX_CHUNKS,
  MAX_SOURCE,
  type SourceBlock,
  type Block,
  type GlossaryEntry,
  unicodeLength,
} from "./model";

export function splitDocument(
  text: string,
  maxLength = MAX_SOURCE,
): SourceBlock[] {
  if (!text.trim()) throw new Error("번역할 원문을 입력해주세요.");
  if (unicodeLength(text) > maxLength)
    throw new Error(
      `문서는 ${maxLength.toLocaleString()}자까지 처리할 수 있습니다. 나누어 입력해주세요.`,
    );
  const parts = text.split(/(\n[ \t]*\n+)/),
    blocks: SourceBlock[] = [];
  let pending = "";
  for (let i = 0; i < parts.length; i += 2) {
    const sep = parts[i + 1] ?? "";
    if (!parts[i].trim()) {
      pending += parts[i] + sep;
      continue;
    }
    const chars = Array.from(pending + parts[i]);
    pending = "";
    const segments: string[] = [];
    while (chars.length) {
      let take = Math.min(CHUNK_SIZE, chars.length);
      if (chars.length > CHUNK_SIZE) {
        const boundary = Math.max(
          chars.slice(0, take).lastIndexOf(" "),
          chars.slice(0, take).lastIndexOf("\n"),
        );
        if (boundary > CHUNK_SIZE / 2) take = boundary + 1;
      }
      segments.push(chars.splice(0, take).join(""));
    }
    segments.forEach((part, n) => {
      blocks.push({
        id: `b${blocks.length + 1}`,
        text: part,
        separator: n === segments.length - 1 ? sep : "",
      });
    });
  }
  if (pending && blocks.length) blocks[blocks.length - 1].separator += pending;
  if (blocks.some((b) => !b.text.trim()))
    throw new Error("문서 앞부분의 긴 공백을 정리한 뒤 다시 실행해주세요.");
  return blocks;
}
export function groupBlocks(
  blocks: SourceBlock[],
  limit = CHUNK_SIZE,
): SourceBlock[][] {
  const groups: SourceBlock[][] = [];
  let current: SourceBlock[] = [],
    size = 0;
  for (const block of blocks) {
    const n = unicodeLength(block.text);
    if (n > limit) throw new Error("문단이 처리 한도를 넘었습니다.");
    if (current.length && (size + n > limit || current.length >= 100)) {
      groups.push(current);
      current = [];
      size = 0;
    }
    current.push(block);
    size += n;
  }
  if (current.length) groups.push(current);
  if (groups.length > MAX_CHUNKS)
    throw new Error("문단 수가 많습니다. 문서를 나누어 입력해주세요.");
  return groups;
}
export function combineBlocks(source: SourceBlock[], translated: Block[]) {
  const mapped = new Map(translated.map((b) => [b.id, b.text]));
  if (
    mapped.size !== translated.length ||
    translated.length !== source.length ||
    source.some((b) => !mapped.has(b.id))
  )
    throw new Error(
      "AI 결과의 문단이 누락되거나 중복되었습니다. 이전 결과는 유지됩니다.",
    );
  return source.map((b) => `${mapped.get(b.id)}${b.separator}`).join("");
}
export function glossaryForChunk(text: string, entries: GlossaryEntry[]) {
  return entries
    .filter((e) =>
      text.toLocaleLowerCase().includes(e.sourceTerm.toLocaleLowerCase()),
    )
    .slice(0, 100);
}
export function sourceBasis(state: {
  sourceText: string;
  options: unknown;
  glossary: unknown;
}) {
  return JSON.stringify([state.sourceText, state.options, state.glossary]);
}
export async function fingerprint(text: string) {
  const bytes = new TextEncoder().encode(text),
    digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export function documentChecks(source: string, translated: string) {
  const urls = [...new Set(source.match(/https?:\/\/[^\s<>"')]+/g) ?? [])];
  const numbers = [...new Set(source.match(/\d+(?:[.,]\d+)*/g) ?? [])].slice(
    0,
    80,
  );
  const translatedNumbers = new Set(translated.match(/\d+(?:[.,]\d+)*/g) ?? []);
  return {
    missingUrls: urls.filter((u) => !translated.includes(u)),
    changedNumbers: numbers.filter((n) => !translatedNumbers.has(n)),
  };
}
export function safeFilename(name: string) {
  return (
    name
      .replace(/\.[^.]+$/, "")
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
      .trim()
      .slice(0, 100) || "문서번역"
  );
}
export function glossaryCsv(entries: GlossaryEntry[]) {
  const cell = (s: string) =>
    `"${(/^[\s\u0000-\u001f]*[=+@-]/.test(s) ? "'" + s : s).replaceAll('"', '""')}"`;
  return (
    "\uFEFF" +
    [
      ["원문 용어", "번역 용어", "설명"],
      ...entries.map((e) => [e.sourceTerm, e.targetTerm, e.note]),
    ]
      .map((row) => row.map(cell).join(","))
      .join("\r\n")
  );
}
