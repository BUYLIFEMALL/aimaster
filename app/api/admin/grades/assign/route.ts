import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

/** POST — 회원 등급 일괄 변경 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin)
    return NextResponse.json({ error: "관리자 권한 필요" }, { status: 403 });

  const { user_ids, grade_id } = await req.json();
  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    return NextResponse.json(
      { error: "변경할 회원을 선택해주세요" },
      { status: 400 }
    );
  }

  // profiles RLS는 본인 행만 수정 가능하도록 되어 있어(profiles_update_own), 로그인
  // 세션 클라이언트로는 "다른 회원"의 등급을 바꾸는 이 요청이 조용히 0건 반영되고
  // 끝나버린다(에러 없이 실패). 관리자 권한은 위에서 이미 확인했으니, 실제 변경은
  // RLS를 우회하는 서비스 클라이언트로 수행한다.
  const service = createServiceClient();
  const { data, error } = await service
    .from("profiles")
    .update({ grade_id: grade_id || null })
    .in("id", user_ids)
    .select("id");

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, updated: data?.length ?? 0 });
}
