import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { maskPersonName } from "@/lib/realestate/report";
import { REPORT_SUMMARY_MODEL } from "@/lib/ai/reportSummary";

// RQ-B4 등기부 권리 점검(2026-11-04, 플랜 docs/PLAN_20261104_RQ_B4_RISK_CHECK.md).
// 회원이 직접 발급해 올린 등기부 PDF를 회원 본인 Claude 키로 1회 읽는다(재시도 없음 — 회원 키 이중 과금 방지).
// PDF·추출 글·결과는 어디에도 저장하지 않고, 서버 기록(console)에도 내용을 남기지 않는다. 사람 이름은 AI 지시 + 서버에서 한 번 더 가린다.

export const REGISTRY_KINDS = ["소유권이전", "근저당", "압류", "가압류", "가처분", "경매개시", "가등기", "신탁", "전세권", "임차권등기", "지상권", "기타"] as const;

export interface RegistryItem {
  kind: (typeof REGISTRY_KINDS)[number];
  rank: string;
  date: string | null;
  amount_manwon: number | null;
  holder: string;
  cancelled: boolean;
  level: "위험" | "주의" | "참고";
  note: string;
}

export interface RegistryResult {
  is_registry: boolean;
  issued_date: string | null;
  property: string;
  owners: string[];
  last_transfer_date: string | null;
  items: RegistryItem[];
  total_max_claim_manwon: number;
  summary: string;
}

const nullableString = { type: ["string", "null"] } as const;
const SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["is_registry", "issued_date", "property", "owners", "last_transfer_date", "items", "total_max_claim_manwon", "summary"],
  properties: {
    is_registry: { type: "boolean" },
    issued_date: nullableString,
    property: { type: "string" },
    owners: { type: "array", items: { type: "string" } },
    last_transfer_date: nullableString,
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "rank", "date", "amount_manwon", "holder", "cancelled", "level", "note"],
        properties: {
          kind: { type: "string", enum: [...REGISTRY_KINDS] },
          rank: { type: "string" },
          date: nullableString,
          amount_manwon: { type: ["integer", "null"] },
          holder: { type: "string" },
          cancelled: { type: "boolean" },
          level: { type: "string", enum: ["위험", "주의", "참고"] },
          note: { type: "string" },
        },
      },
    },
    total_max_claim_manwon: { type: "integer" },
    summary: { type: "string" },
  },
} as const;

export async function analyzeRegistry(apiKey: string, pdfBase64: string): Promise<RegistryResult> {
  const year = new Date().getFullYear();
  const client = new Anthropic({ apiKey, timeout: 120_000, maxRetries: 0 });
  const res = await client.messages.create({
    model: REPORT_SUMMARY_MODEL,
    max_tokens: 4000,
    output_config: { format: { type: "json_schema", schema: SCHEMA } },
    system:
      `당신은 한국 부동산 등기사항전부증명서(등기부등본)를 읽어 권리 관계를 정리하는 보조입니다. 현재 연도는 ${year}년입니다.\n` +
      "문서에 적힌 내용만 옮기고 추측하지 마세요. 등기부가 아니면 is_registry를 false로 하고 나머지는 비우세요.\n" +
      "사람 이름은 성만 남기고 가리세요(예: 김○○). 회사·은행·기관 이름은 그대로 쓰세요. 주민등록번호·주소는 쓰지 마세요.\n" +
      "items에는 갑구·을구의 등기 목적을 순위번호와 함께 넣으세요. 말소된 등기는 cancelled=true로 넣으세요.\n" +
      "금액은 만 원 단위 정수(채권최고액·전세금·청구금액). level: 압류·가압류·가처분·경매개시·가등기·신탁·임차권등기는 「위험」, 말소 안 된 근저당·전세권은 「주의」, 소유권이전·말소된 것은 「참고」.\n" +
      "total_max_claim_manwon은 말소되지 않은 근저당 채권최고액 합계입니다. summary는 쉬운 존댓말 2~3문장이며 매수·계약 권유나 안전 단정은 하지 마세요.",
    messages: [
      {
        role: "user",
        content: [
          { type: "document", source: { type: "base64", media_type: "application/pdf", data: pdfBase64 } },
          { type: "text", text: "이 등기부의 권리 관계를 정해진 형식으로 정리해 주세요." },
        ],
      },
    ],
  });
  if (res.stop_reason === "refusal") throw new Error("AI가 이 문서를 처리하지 않았습니다.");
  if (res.stop_reason === "max_tokens") throw new Error("등기부가 너무 길어 끝까지 정리하지 못했습니다.");
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  let parsed: RegistryResult;
  try {
    parsed = JSON.parse(text) as RegistryResult;
  } catch {
    throw new Error("AI 응답을 읽지 못했습니다.");
  }
  return {
    ...parsed,
    owners: parsed.owners.map(maskPersonName),
    items: parsed.items.map((it) => ({ ...it, holder: maskPersonName(it.holder) })),
  };
}
