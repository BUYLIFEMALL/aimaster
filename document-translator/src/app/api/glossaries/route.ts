import { NextRequest, NextResponse } from "next/server";
import {
  authorize,
  failure,
  readBody,
  NO_STORE,
  dbFailure,
} from "@/lib/translation/api";
import {
  glossaryInputSchema,
  glossaryEntrySchema,
} from "@/lib/translation/model";
import { saveGlossary } from "@/lib/translation/repository";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export async function GET() {
  try {
    const user = await authorize(),
      { data, error } = await createAdminClient()
        .from("dt_glossaries")
        .select("id,name,entries,revision,updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(20);
    if (error) dbFailure(error.code);
    return NextResponse.json(
      {
        glossaries: (data ?? []).map((row) => ({
          ...row,
          entries: z.array(glossaryEntrySchema).max(200).parse(row.entries),
        })),
      },
      { headers: NO_STORE },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(request: NextRequest) {
  try {
    const input = await readBody(request, glossaryInputSchema),
      user = await authorize();
    return NextResponse.json(await saveGlossary(user.id, input), {
      headers: NO_STORE,
    });
  } catch (e) {
    return failure(e);
  }
}
