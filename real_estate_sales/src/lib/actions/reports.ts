"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProgramAccess } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";
import { resolveApiKey } from "@/lib/apiKeys";
import { parseAskingPrice } from "@/lib/realestate/report";
import { REPORT_SUMMARY_MODEL, reportFactsText, summarizeReport } from "@/lib/ai/reportSummary";
import type { ReportSnapshot } from "@/components/report/ReportBody";

// B2 주소 리포트 저장·삭제·AI 총평(2026-11-03). 표 real_estate_saved_reports(회원 본인만, RLS) — 타입 생성 전이라 느슨한 클라이언트로 부른다.
type SupabaseLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any
const TABLE = "real_estate_saved_reports";

export interface ReportActionState {
  error?: string;
  needsKey?: boolean;
}

export async function saveReportAction(_prev: ReportActionState, formData: FormData): Promise<ReportActionState> {
  const user = await requireProgramAccess();
  const source = String(formData.get("source") ?? "");
  const pnu = String(formData.get("pnu") ?? "");
  const title = String(formData.get("title") ?? "").slice(0, 200);
  const subtitle = String(formData.get("subtitle") ?? "").slice(0, 300) || null;
  const raw = String(formData.get("report") ?? "");
  const askingText = String(formData.get("asking") ?? "").trim();
  if (!["listing", "onsite"].includes(source) || !/^\d{19}$/.test(pnu) || !title) return { error: "리포트 정보가 올바르지 않습니다. 화면을 새로 고친 뒤 다시 저장해 주세요." };
  if (raw.length > 200_000) return { error: "리포트가 너무 커서 저장하지 못했습니다." };
  let report: ReportSnapshot;
  try {
    report = JSON.parse(raw) as ReportSnapshot;
    if (!report?.sale || !Array.isArray(report.errors)) throw new Error("shape");
  } catch {
    return { error: "리포트 내용을 읽지 못했습니다. 화면을 새로 고친 뒤 다시 저장해 주세요." };
  }
  const asking = askingText ? parseAskingPrice(askingText) : null;
  if (askingText && !asking) return { error: "호가를 읽지 못했습니다. 「8억 5,000」 「8.5억」 「85000」처럼 넣어 주세요." };

  const db = (await createClient()) as unknown as SupabaseLike;
  const { data, error } = await db
    .from(TABLE)
    .insert({ user_id: user.id, source, source_id: String(formData.get("sourceId") ?? "") || null, pnu, title, subtitle, report, asking_price: asking })
    .select("id")
    .single();
  if (error || !data) return { error: `저장하지 못했습니다: ${error?.message ?? "알 수 없는 오류"}` };
  revalidatePath("/report/saved");
  redirect(`/report/saved/${data.id}`);
}

export async function deleteSavedReportAction(formData: FormData): Promise<void> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const db = (await createClient()) as unknown as SupabaseLike;
  await db.from(TABLE).delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/report/saved");
  redirect("/report/saved");
}

export async function aiSummaryAction(_prev: ReportActionState, formData: FormData): Promise<ReportActionState> {
  const user = await requireProgramAccess();
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  const db = supabase as unknown as SupabaseLike;

  const apiKey = await resolveApiKey(supabase, user.id, "anthropic");
  if (!apiKey) return { error: "Claude(Anthropic) API 키가 없습니다. 「API키등록·플랫폼연동」에서 본인 키를 등록해 주세요.", needsKey: true };

  // 두 번 누르기·여러 탭으로 겹쳐 부르지 않게, 1분 안에 요청한 적이 없을 때만 표시를 먼저 남기고 부른다
  const cutoff = new Date(Date.now() - 60_000).toISOString();
  const { data: claimed } = await db
    .from(TABLE)
    .update({ ai_requested_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id)
    .or(`ai_requested_at.is.null,ai_requested_at.lt.${cutoff}`)
    .select("id, title, subtitle, report, asking_price")
    .maybeSingle();
  if (!claimed) return { error: "방금 AI 총평을 요청했습니다. 1분 뒤에 다시 눌러 주세요." };

  try {
    const text = await summarizeReport(apiKey, reportFactsText(claimed.title, claimed.subtitle, claimed.report as ReportSnapshot, claimed.asking_price));
    await db.from(TABLE).update({ ai_summary: text, ai_model: REPORT_SUMMARY_MODEL }).eq("id", id).eq("user_id", user.id);
  } catch (e) {
    return { error: `AI 총평을 받지 못했습니다: ${e instanceof Error ? e.message : String(e)}` };
  }
  revalidatePath(`/report/saved/${id}`);
  return {};
}
