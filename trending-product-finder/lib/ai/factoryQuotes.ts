import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { REPORT_SCHEMA, sanitizeReport, type QuoteReport } from "@/lib/factoryQuotes";
import { withYearRule } from "@/lib/ai/yearRule";
import { DRAFT_MODEL } from "@/lib/ai/claude";

// EC-W10 견적서(PDF)·대화 캡처(사진)·붙여 넣은 대화·엑셀 글을 회원 본인 Claude 키로 한 번에 읽어 비교표를 만든다.
// 회원이 누를 때 1번, 재시도 없음(회원 키 이중 과금 방지). 모델은 AI 모델 선택표 Claude 기본값(균형).
export const QUOTE_MODEL = DRAFT_MODEL;

export type QuoteInputFile =
  | { kind: "pdf"; name: string; base64: string }
  | { kind: "image"; name: string; mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; base64: string };

export type QuoteInput = {
  productName: string;
  pastedText: string;
  sheets: { name: string; text: string }[];
  files: QuoteInputFile[];
  note: string;
};

const SYSTEM =
  "당신은 한국 셀러를 돕는 해외 소싱(중국 공장·알리바바·1688) 담당자입니다. 셀러가 공장과 주고받은 견적서·사양서·위챗 대화(캡처 사진 또는 붙여 넣은 글)를 읽고 " +
  "공장별 견적을 같은 기준으로 정리합니다. 규칙: 자료에 적힌 값만 씁니다(추측 금지 — 모르면 숫자는 반드시 null, 글자는 빈 글자). 0은 자료에 무료·없음(free, 免费, waived)이라고 적혀 있을 때만 씁니다.금액은 숫자만, 통화는 USD·CNY·JPY·EUR·KRW처럼 적고, " +
  "가격 조건(EXW·FOB·DDP 등)은 price_basis에, 수량 구간 가격은 tiers에, 기간은 일(day) 단위 숫자로 바꿉니다(예: 2주 → 14). " +
  "unconfirmed에는 인증(KC·FDA 등)·로고 인쇄·개별 포장·불량 처리·배송 방식처럼 아직 확인되지 않은 점을, pending에는 셀러가 물었는데 공장이 아직 답하지 않은 질문을(날짜가 있으면 함께) 적습니다. " +
  "next_questions에는 셀러가 다음에 보낼 질문을 최대 3개, 한국어(ko)·영어(en)·중국어 간체(zh)로 적습니다 — 정중하고 짧게, 단가 협상이 필요하면 근거(다른 공장 단가·주문 수량)를 넣습니다. " +
  "summary에는 어느 공장이 어떤 점에서 유리한지 한국어 두세 문장으로 씁니다. 공장 이름이 없으면 자료에서 구분되는 이름(담당자 이름·파일 이름)을 씁니다.";

export async function analyzeQuotes(apiKey: string, input: QuoteInput): Promise<QuoteReport> {
  const client = new Anthropic({ apiKey, timeout: 110_000, maxRetries: 0 });
  type Block =
    | { type: "text"; text: string }
    | { type: "document"; source: { type: "base64"; media_type: "application/pdf"; data: string }; title?: string }
    | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: string } };
  const content: Block[] = [];
  for (const f of input.files) {
    content.push({ type: "text", text: `[파일] ${f.name}` });
    if (f.kind === "pdf") content.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data: f.base64 }, title: f.name });
    else content.push({ type: "image", source: { type: "base64", media_type: f.mediaType, data: f.base64 } });
  }
  for (const s of input.sheets) content.push({ type: "text", text: `<sheet name="${s.name}">\n${s.text}\n</sheet>` });
  content.push({
    type: "text",
    text: [
      `<product>${input.productName}</product>`,
      input.pastedText ? `<chat_and_notes>\n${input.pastedText}\n</chat_and_notes>` : "",
      input.note ? `<seller_request>${input.note}</seller_request>` : "",
      "위 자료로 공장별 비교표·미확인·미답변·다음 질문을 만들어 주세요.",
    ]
      .filter(Boolean)
      .join("\n"),
  });

  const res = await client.beta.messages.create({
    model: QUOTE_MODEL,
    max_tokens: 6000,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    output_config: { effort: "low", format: { type: "json_schema", schema: REPORT_SCHEMA as unknown as Record<string, unknown> } },
    system: withYearRule(SYSTEM),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    messages: [{ role: "user", content: content as any }],
  });
  if (res.stop_reason === "refusal") throw new Error("AI가 이 자료를 처리하지 않았습니다.");
  if (res.stop_reason === "max_tokens") throw new Error("자료가 너무 많아 결과가 잘렸습니다. 파일 수를 줄여 다시 시도해 주세요.");
  const textBlock = res.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("AI 응답이 비었습니다.");
  return sanitizeReport(JSON.parse(textBlock.text));
}
