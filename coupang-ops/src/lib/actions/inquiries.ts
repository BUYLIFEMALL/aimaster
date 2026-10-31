"use server";

import { requireProgramAccess } from "@/lib/access";
import { getWingKeys } from "@/lib/data";
import { wingRequest, WingApiError } from "@/lib/coupang/client";
import { callBudgetBlock } from "@/lib/coupang/usage";
import { centerConfirmPath, centerListPath, centerQuery, centerReplyPath, checkReply, inquiryRange, INQUIRY_READ_GAP_SECONDS, normalizeCenter, normalizeOnline, onlineListPath, onlineQuery, onlineReplyPath, redactInquiry, sortInquiries, type InquiryRow } from "@/lib/coupang/inquiry";
import { takeReadSlot } from "@/lib/readGap";
import { createClient } from "@/lib/supabase/server";

export type InquiryList = { ok: true; rows: InquiryRow[]; failed: string[]; from: string; to: string } | { ok: false; error: string };
type Done = { ok: true } | { ok: false; error: string };

const NO_KEYS = "먼저 「쿠팡 연결」에서 키를 등록해 주세요.";
const wingMsg = (e: unknown) => (e instanceof WingApiError ? e.message : "연결 오류");
/** 쓰기 실패 안내. 응답을 못 받았으면 이미 처리됐을 수 있어 다시 보내지 말라고 알린다 */
const writeFail = (e: unknown, what: string): Done =>
  e instanceof WingApiError && e.status >= 400 && e.status < 500 ? { ok: false, error: `${what}: ${e.message}` } : { ok: false, error: "쿠팡 응답을 받지 못했습니다. 이미 처리됐을 수 있으니 목록을 다시 불러와 확인해 주세요." };

/** 미답변 상품 문의 + 고객센터 미답변·미확인. 쿠팡 읽기 3회, 버튼을 눌렀을 때만 */
export async function listInquiriesAction(): Promise<InquiryList> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  const blocked = await callBudgetBlock(user.id);
  if (blocked) return { ok: false, error: blocked };
  const wait = await takeReadSlot(user.id, "coupang_inquiry_read", INQUIRY_READ_GAP_SECONDS);
  if (wait > 0) return { ok: false, error: `조금 전에 불러왔습니다. ${wait}초 뒤에 다시 눌러 주세요.` };
  const range = inquiryRange(Date.now());
  const failed: string[] = [];
  const read = async (label: string, work: () => Promise<InquiryRow[]>) => {
    try {
      return await work();
    } catch (e) {
      failed.push(`${label}: ${wingMsg(e)}`);
      return [];
    }
  };
  const [online, center, transfer] = await Promise.all([
    read("상품 문의", async () => normalizeOnline((await wingRequest(keys, "GET", onlineListPath(keys.vendorId), { query: onlineQuery(keys.vendorId, range) })).data).rows),
    read("고객센터 미답변", async () => normalizeCenter((await wingRequest(keys, "GET", centerListPath(keys.vendorId), { query: centerQuery("NO_ANSWER", range) })).data, "NO_ANSWER").rows),
    read("고객센터 미확인", async () => normalizeCenter((await wingRequest(keys, "GET", centerListPath(keys.vendorId), { query: centerQuery("TRANSFER", range) })).data, "TRANSFER").rows),
  ]);
  return { ok: true, rows: [...sortInquiries(center), ...sortInquiries(transfer), ...sortInquiries(online)], failed, from: range.from, to: range.to };
}

export type DraftReply = { ok: true; reply: string; needsCheck: string[] } | { ok: false; error: string; needKey?: boolean };

/** AI 답변 초안 — 회원 본인 Claude 키만 쓴다(운영자 키 폴백 없음). 저장·등록하지 않고 화면으로만 돌려준다 */
export async function draftReplyAction(input: { question: string; itemName: string; sellerFacts: string }): Promise<DraftReply> {
  const user = await requireProgramAccess();
  const supabase = await createClient();
  const { data: key } = await supabase.from("user_api_keys").select("api_key").eq("user_id", user.id).eq("provider", "anthropic").maybeSingle();
  const apiKey = String(key?.api_key ?? "").trim();
  if (!apiKey) return { ok: false, needKey: true, error: "Claude(Anthropic) API 키가 없습니다. 메인 사이트 「API키생성|플랫폼연동」에서 본인 키를 등록해 주세요." };
  const question = redactInquiry(String(input.question ?? "")).slice(0, 3000);
  if (!question) return { ok: false, error: "문의 내용이 비어 있습니다." };
  try {
    const { draftInquiryReply } = await import("@/lib/ai/claude");
    const r = await draftInquiryReply(apiKey, { question, itemName: String(input.itemName ?? "").slice(0, 200), sellerFacts: redactInquiry(String(input.sellerFacts ?? "")).slice(0, 1500) });
    return { ok: true, reply: r.reply, needsCheck: r.needsCheck };
  } catch (e) {
    console.error("[coupang-ops] draft", (e as Error).name);
    return { ok: false, error: `초안을 만들지 못했습니다(${(e as Error).message.slice(0, 120)}). 직접 답변해 주세요.` };
  }
}

/** 회원이 확인한 답변을 쿠팡에 등록한다. 재시도 없음(client) */
export async function sendReplyAction(input: { kind: "product" | "center"; id: string; parentAnswerId: string; content: string }): Promise<Done> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  const content = String(input.content ?? "").trim();
  const problem = checkReply(content);
  if (problem) return { ok: false, error: problem };
  const id = String(input.id ?? "").trim();
  if (!/^\d+$/.test(id)) return { ok: false, error: "문의 번호가 올바르지 않습니다." };
  try {
    if (input.kind === "center") {
      const parentAnswerId = String(input.parentAnswerId ?? "").trim();
      if (!parentAnswerId) return { ok: false, error: "고객센터 이관글 번호를 읽지 못해 보내지 않았습니다. WING에서 답변해 주세요." };
      await wingRequest(keys, "POST", centerReplyPath(keys.vendorId, id), { body: { vendorId: keys.vendorId, inquiryId: id, content, replyBy: keys.wingUserId, parentAnswerId } });
    } else {
      await wingRequest(keys, "POST", onlineReplyPath(keys.vendorId, id), { body: { content, vendorId: keys.vendorId, replyBy: keys.wingUserId } });
    }
    return { ok: true };
  } catch (e) {
    return writeFail(e, "답변을 보내지 못했습니다");
  }
}

/** 쿠팡이 상담을 끝내고 넘긴 건의 확인 처리(답변은 필요 없음) */
export async function confirmInquiryAction(id: string): Promise<Done> {
  const user = await requireProgramAccess();
  const keys = await getWingKeys(user.id);
  if (!keys) return { ok: false, error: NO_KEYS };
  const clean = String(id ?? "").trim();
  if (!/^\d+$/.test(clean)) return { ok: false, error: "문의 번호가 올바르지 않습니다." };
  try {
    await wingRequest(keys, "POST", centerConfirmPath(keys.vendorId, clean), { body: { confirmBy: keys.wingUserId } });
    return { ok: true };
  } catch (e) {
    return writeFail(e, "확인 처리하지 못했습니다");
  }
}
