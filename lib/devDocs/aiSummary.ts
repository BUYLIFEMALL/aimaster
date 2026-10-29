import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// 개발 문서 관리 「🤖 AI 정리」 — 관리자 페이지 AI는 관리자 계정 Claude 키로 부른다
// (2026-10-29 주인님 「관리자 페이지상에서 사용하는건 전부 클로드코드 API를 사용하도록 해」, docs/CLAUDE_CODE_API_CREDIT.md §2-0).
const MODEL = "claude-opus-5-5";
export const MAX_INPUT_CHARS = 80_000;

export type AiSummaryItem = {
  title: string;
  ask: string;
  source: string;
  importance: number;
  quickness: number;
  importanceReason: string;
  quicknessReason: string;
};
export type AiSummary = {
  overview: string;
  items: AiSummaryItem[];
  stale: { title: string; reason: string }[];
  duplicates: { titles: string[]; reason: string }[];
};

const SCHEMA = {
  type: "object",
  properties: {
    overview: { type: "string" },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          ask: { type: "string" },
          source: { type: "string" },
          importance: { type: "integer" },
          quickness: { type: "integer" },
          importanceReason: { type: "string" },
          quicknessReason: { type: "string" },
        },
        required: ["title", "ask", "source", "importance", "quickness", "importanceReason", "quicknessReason"],
        additionalProperties: false,
      },
    },
    stale: {
      type: "array",
      items: {
        type: "object",
        properties: { title: { type: "string" }, reason: { type: "string" } },
        required: ["title", "reason"],
        additionalProperties: false,
      },
    },
    duplicates: {
      type: "array",
      items: {
        type: "object",
        properties: { titles: { type: "array", items: { type: "string" } }, reason: { type: "string" } },
        required: ["titles", "reason"],
        additionalProperties: false,
      },
    },
  },
  required: ["overview", "items", "stale", "duplicates"],
  additionalProperties: false,
};

const SYSTEM =
  "You help the owner of a Korean software platform triage an admin dashboard. " +
  "The dashboard lists work items, requests and status tables written by several AI coding sessions. " +
  "Read the menu text you are given and pick out what the owner should look at or act on. " +
  "For each item: title (short), ask (what the owner needs to do or decide, one sentence), source (session, role or program named in the text), " +
  "importance 1-5 (5 = blocks other work, affects members or revenue, or involves cost/security), " +
  "quickness 1-5 (5 = the owner can finish it in a few minutes, e.g. one approval or one click), " +
  "and one or two sentences for each reason, quoting the words in the text that support it. " +
  "Only use facts present in the text; never invent dates, numbers or status. " +
  "List items that look already finished or no longer needed under stale, and items that describe the same thing under duplicates. " +
  "Keep at most 25 items. Write every string in natural Korean polite style (-습니다).";

export async function summarizeMenu(apiKey: string, tabLabel: string, text: string): Promise<AiSummary> {
  const client = new Anthropic({ apiKey, timeout: 240_000, maxRetries: 0 }); // 재시도 없음 — 이중 과금 방지
  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: `<menu name="${tabLabel}">\n${text.slice(0, MAX_INPUT_CHARS)}\n</menu>` }],
  });
  if (res.stop_reason === "refusal") throw new Error("AI가 이 내용을 정리하지 않았습니다.");
  if (res.stop_reason === "max_tokens") throw new Error("내용이 너무 길어 정리가 중간에 끊겼습니다. 다시 시도해 주세요.");
  const block = res.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") throw new Error("AI 응답이 비었습니다.");
  const parsed = JSON.parse(block.text) as AiSummary;
  const clamp = (n: unknown) => Math.min(5, Math.max(1, Math.round(Number(n) || 1)));
  return {
    overview: String(parsed.overview ?? ""),
    items: (parsed.items ?? []).map((i) => ({ ...i, importance: clamp(i.importance), quickness: clamp(i.quickness) })),
    stale: parsed.stale ?? [],
    duplicates: parsed.duplicates ?? [],
  };
}
