import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authorize,
  failure,
  readBody,
  NO_STORE,
  dbFailure,
  AppError,
} from "@/lib/translation/api";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export async function POST(request: NextRequest) {
  try {
    const input = await readBody(
        request,
        z
          .object({ id: z.uuid(), revision: z.number().int().positive() })
          .strict(),
      ),
      user = await authorize();
    const { data, error } = await createAdminClient()
      .from("dt_projects")
      .delete()
      .eq("user_id", user.id)
      .eq("id", input.id)
      .eq("revision", input.revision)
      .select("id");
    if (error) dbFailure(error.code);
    if (!data?.length)
      throw new AppError(
        "기록이 변경됐거나 삭제할 권한이 없습니다. 목록을 다시 불러와주세요.",
        409,
      );
    return NextResponse.json({ ok: true }, { headers: NO_STORE });
  } catch (e) {
    return failure(e);
  }
}
