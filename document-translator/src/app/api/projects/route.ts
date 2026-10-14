import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  authorize,
  failure,
  dbFailure,
  AppError,
  NO_STORE,
  readBody,
} from "@/lib/translation/api";
import { projectInputSchema, stateSchema } from "@/lib/translation/model";
import { saveProject } from "@/lib/translation/repository";
import { createAdminClient } from "@/lib/supabase/admin";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export async function GET(request: NextRequest) {
  try {
    const user = await authorize(),
      id = request.nextUrl.searchParams.get("id");
    const query = createAdminClient()
      .from("dt_projects")
      .select(
        id
          ? "id,title,payload,revision,updated_at,expires_at"
          : "id,title,revision,updated_at,expires_at",
      )
      .eq("user_id", user.id)
      .gt("expires_at", new Date().toISOString());
    if (id) {
      z.uuid().parse(id);
      const { data, error } = await query.eq("id", id).maybeSingle();
      if (error) dbFailure(error.code);
      if (!data)
        throw new AppError("기록이 없거나 보관 기간이 끝났습니다.", 404);
      const project = z
        .object({
          id: z.uuid(),
          title: z.string(),
          payload: stateSchema,
          revision: z.number().int(),
          updated_at: z.string(),
          expires_at: z.string(),
        })
        .parse(data);
      return NextResponse.json({ project }, { headers: NO_STORE });
    }
    const { data, error } = await query
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) dbFailure(error.code);
    return NextResponse.json({ projects: data ?? [] }, { headers: NO_STORE });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: NextRequest) {
  try {
    const input = await readBody(request, projectInputSchema, 1024 * 1024),
      user = await authorize();
    return NextResponse.json(await saveProject(user.id, input), {
      headers: NO_STORE,
    });
  } catch (e) {
    return failure(e);
  }
}
