import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { isReportId, judgeHandoff, type HandoffRow } from "@/lib/keywordEvidence";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// BLC-11 (2026-10-22): 키워드 도구(blog-keyword)에서 넘어온 기록 번호로 같은 회원의 기록을 다시 읽는다. 읽기만 하고 SEO DB에는 저장하지 않는다.
// 두 프로그램 이용 권한을 모두 확인하고, 본인 기록만(RLS + user_id), 만든 지 30일 안의 기록(v2.03: 즐겨찾기는 기간 무관)만 돌려준다.
export async function GET(_request: Request, context: { params: Promise<{ reportId: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const keywordAccess = await checkProgramAccessApi("blog-keyword");
  if (!keywordAccess.allowed) return NextResponse.json({ error: "「AI 블로그 키워드 자동화」 이용 권한이 없어 넘어온 자료를 열 수 없습니다." }, { status: 403 });

  const { reportId } = await context.params;
  if (!isReportId(reportId)) return NextResponse.json({ error: "키워드 기록 번호를 확인해 주세요." }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blog_keyword_reports")
    .select("id, user_id, feature, keyword, created_at, favorite, result")
    .eq("id", reportId)
    .eq("user_id", access.user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: "키워드 기록을 읽지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500 });

  const judged = judgeHandoff(data as HandoffRow | null, access.user.id);
  if (!judged.ok) return NextResponse.json({ error: judged.error }, { status: judged.status });
  return NextResponse.json({ evidence: judged.evidence });
}
