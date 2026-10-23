import { NextRequest, NextResponse } from "next/server";
import { checkProgramAccessApi, THIS_PROGRAM_SLUG } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { logProgramUsage } from "@/lib/programAccess";
import { viaSource } from "@/lib/linkMark";

// 권한 확인 결과가 정적으로 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

/**
 * POST { via } — v1.21: 다른 프로그램 「형식 바꾸기」로 받은 그림의 변환을 처음 마쳤다는 신호.
 * 변환은 브라우저 안에서만 하므로 그림은 받지 않고, 회원 본인의 usage_logs에 1줄(action `linked_convert`, metadata.via)만 남긴다.
 * via는 공용 `link-mark` 이름표에 있는 것만 받는다(관리자 연계 통계 「변환 완료」용).
 */
export async function POST(req: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  const body = await req.json().catch(() => null);
  const via = viaSource(body?.via)?.key;
  if (!via) return NextResponse.json({ error: "보낸 프로그램을 알 수 없습니다." }, { status: 400 });

  const admin = createAdminClient();
  const { data: program } = await admin.from("programs").select("id").eq("slug", THIS_PROGRAM_SLUG).maybeSingle();
  if (!program) return NextResponse.json({ error: "프로그램 정보를 찾지 못했습니다." }, { status: 500 });
  await logProgramUsage(admin, { userId: access.user.id, programId: program.id as string, action: "linked_convert", metadata: { via } });
  return NextResponse.json({ ok: true });
}
