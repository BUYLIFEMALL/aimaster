import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccessApi } from "@/lib/access";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 작업 상태 폴링 엔드포인트. RLS가 적용된 일반 클라이언트만 사용해서, 다른 사용자의
// job id를 추측해서 조회하더라도(uuid라 사실상 불가능하지만) 절대 조회되지 않도록 한다.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const { id } = await params;
  const supabase = await createClient();

  const { data: job, error } = await supabase
    .from("web_crawler_jobs")
    .select("status, result_url, row_count, error_message, pii_warning")
    .eq("id", id)
    .eq("user_id", access.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!job) {
    return NextResponse.json({ error: "작업을 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json(job);
}
