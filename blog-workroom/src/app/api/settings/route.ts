import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json, loadSettings } from "@/lib/route";
import { createItem, getSettings, updateItem } from "@/lib/store";
import { isImageModel, isTextModel } from "@/lib/models";
import { UserError } from "@/lib/errors";
import type { Settings } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  try { const g = await guard(request); if (g instanceof NextResponse) return g; return json({ settings: await loadSettings(g.userId) }); } catch (e) { return fail(e); }
}

export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const { provider, model, imageModel } = g.body;
    if ((provider !== "openai" && provider !== "gemini") || !isTextModel(provider, model) || !isImageModel(imageModel)) throw new UserError(400, "모델 선택을 확인해 주세요.");
    const data: Settings = { provider, model: model as string, imageModel: imageModel as string };
    const cur = await getSettings<Settings>(g.userId);
    if (cur) await updateItem(g.userId, cur.id, { data }); else await createItem(g.userId, "settings", "설정", data);
    return json({ settings: data });
  } catch (e) { return fail(e); }
}
