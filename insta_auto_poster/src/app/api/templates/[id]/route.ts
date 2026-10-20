import { NextResponse } from "next/server";
import { authorize } from "@/lib/cardnews/apiGuard";
import { createClient } from "@/lib/cardnews/supabase/server";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const gate = await authorize();
  if (!gate.ok) return gate.response;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "템플릿 주소가 올바르지 않습니다." }, { status: 400 });

  const supabase = await createClient();
  const { error } = await supabase.from("cns_templates").delete().eq("id", id).eq("user_id", gate.auth.user.id);
  if (error) return NextResponse.json({ error: "템플릿을 삭제하지 못했습니다." }, { status: 500 });
  return NextResponse.json({ success: true });
}
