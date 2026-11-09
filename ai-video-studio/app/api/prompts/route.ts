import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { listMine, listPresets } from "@/lib/promptStore";
import { createAdminClient } from "@/lib/supabase/server";
import { isRetentionExempt } from "@/lib/retentionExempt";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NO_STORE = { "Cache-Control": "private, no-store" };

/** 게시판 예시(관리자는 숨김 포함) + 내 프롬프트(본인만) */
export async function GET() {
  const { user, access, errorResponse } = await checkProgramAccessApi();
  if (errorResponse) return errorResponse;
  const isAdmin = access?.reason === "admin";
  const exempt = await isRetentionExempt(createAdminClient(), user.id);
  const [board, mine] = await Promise.all([listPresets(isAdmin), listMine(user.id, exempt)]);
  return NextResponse.json({ presets: board.presets, source: board.source, mine, isAdmin }, { headers: NO_STORE });
}
