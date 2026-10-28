import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import type { AttrDef } from "@/lib/smartstore/attributes";

// 상품속성 추천 — 회원 본인 Claude(Anthropic) 키로 한 번 부른다(주인님 2026-10-28 「앞으로 기본 api키 사용은 클로드야」).
// 판매자센터 보기 목록 안에서만 고르게 하고, 결과는 서버에서 다시 걸러 화면에만 채운다(자동으로 보내지 않음).
const MODEL = "claude-opus-5-5";

export type SuggestSource = { name: string; category: string; keyFeatures: string; specs: string; howToUse: string; target: string };

const SCHEMA = {
  type: "object",
  properties: {
    picks: {
      type: "array",
      items: {
        type: "object",
        properties: { name: { type: "string" }, values: { type: "array", items: { type: "string" } } },
        required: ["name", "values"],
        additionalProperties: false,
      },
    },
  },
  required: ["picks"],
  additionalProperties: false,
};

const SYSTEM =
  "You fill in Naver SmartStore product attributes for a Korean seller. " +
  "For each attribute you may only choose values copied exactly from that attribute's allowed list. " +
  "Choose a value only when the product information clearly supports it; leave the attribute out when unsure. " +
  "Respect each attribute's maximum count and pick at most one value for single-choice attributes.";

export async function suggestAttributes(apiKey: string, src: SuggestSource, attrs: AttrDef[]): Promise<{ name: string; values: string[] }[]> {
  const client = new Anthropic({ apiKey, timeout: 60_000, maxRetries: 0 }); // 재시도 없음 — 회원 키 이중 과금 방지
  const list = attrs
    .filter((a) => a.values.length)
    .map((a) => `- ${a.name} (${a.type === "MULTI_SELECT" ? `여러 개${a.max ? `, 최대 ${a.max}개` : ""}` : "한 개"}): ${a.values.join(" | ")}`)
    .join("\n");
  const product = [
    `상품명: ${src.name}`,
    `카테고리: ${src.category}`,
    src.keyFeatures && `특징: ${src.keyFeatures}`,
    src.specs && `사양: ${src.specs}`,
    src.howToUse && `사용법: ${src.howToUse}`,
    src.target && `대상 고객: ${src.target}`,
  ].filter(Boolean).join("\n");

  const res = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 4000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [{ role: "user", content: `<product>\n${product}\n</product>\n\n<attributes>\n${list}\n</attributes>` }],
  });
  if (res.stop_reason === "refusal") throw new Error("AI가 이 요청을 처리하지 않았습니다. 직접 골라 주세요.");
  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("AI 응답이 비었습니다.");
  const parsed = JSON.parse(text.text) as { picks?: { name?: unknown; values?: unknown }[] };
  return (parsed.picks ?? []).map((p) => ({ name: String(p.name ?? ""), values: Array.isArray(p.values) ? p.values.map(String) : [] }));
}
