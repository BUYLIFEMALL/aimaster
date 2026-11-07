import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendToWorkInbox } from "@/lib/workInbox";
import { analysisInboxContent } from "@/lib/workInboxContent";
import { retentionCutoff } from "@/lib/retention";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const PROGRAM_SLUG = "competitor-analysis";
const APP_URL = "https://competitor-analysis.buylife.xyz";
const INBOX_URL = "https://ai-work-workspace.buylife.xyz/inbox";

// U10 2차: 경쟁사 분석 결과 한 건을 로그인 회원 본인의 업무 워크스페이스 「받은 업무」로 보낸다.
// 내용은 브라우저가 보낸 값이 아니라 회원 본인 분석(user_id 조건, 30일 보관 안)을 서버가 다시 읽어 만든다.
export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin) {
    return NextResponse.json({ error: "요청 출처를 확인할 수 없습니다." }, { status: 403 });
  }
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const userId = access.user.id;

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null;
  const id = typeof body?.id === "string" ? body.id : "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "분석 결과를 찾지 못했습니다." }, { status: 404 });

  const db = createAdminClient();
  const cutoff = retentionCutoff();
  const { data: analysis } = await db
    .from("competitor_analyses")
    .select("id, keyword_id, job_id, summary_text, created_at")
    .eq("id", id)
    .eq("user_id", userId)
    .gt("created_at", cutoff)
    .maybeSingle();
  if (!analysis?.summary_text) return NextResponse.json({ error: "분석 결과를 찾지 못했습니다." }, { status: 404 });

  const [{ data: keyword }, { data: job }, { data: results }] = await Promise.all([
    db.from("competitor_keywords").select("keyword").eq("id", analysis.keyword_id).eq("user_id", userId).maybeSingle(),
    db.from("competitor_serp_jobs").select("total_results").eq("id", analysis.job_id).eq("user_id", userId).maybeSingle(),
    db.from("competitor_serp_results").select("position, title, domain, link").eq("job_id", analysis.job_id).eq("user_id", userId).eq("result_type", "organic").gt("created_at", cutoff).order("position", { ascending: true, nullsFirst: false }).limit(10),
  ]);

  try {
    const content = analysisInboxContent({
      keyword: keyword?.keyword ?? "",
      summaryText: analysis.summary_text,
      createdAt: analysis.created_at,
      totalResults: job?.total_results ?? null,
      topResults: results ?? [],
    });
    await sendToWorkInbox({
      userId,
      sourceSlug: PROGRAM_SLUG,
      kind: "document",
      title: content.title,
      bodyMd: content.bodyMd,
      data: content.data,
      sourceUrl: `${APP_URL}/keywords/${analysis.keyword_id}/jobs/${analysis.job_id}`,
    });
    return NextResponse.json({ ok: true, title: content.title, inboxUrl: INBOX_URL }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "업무 워크스페이스로 보내지 못했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
