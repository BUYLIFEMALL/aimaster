import { NextRequest, NextResponse } from "next/server";
import { getPage } from "@/lib/store";
import { checkProgramAccessApi } from "@/lib/access";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const supabase = await createClient();
  const html = await getPage(supabase, access.user.id, params.id);

  if (!html) {
    return NextResponse.json({ error: "페이지를 찾을 수 없습니다." }, { status: 404 });
  }

  return NextResponse.json({ html });
}
