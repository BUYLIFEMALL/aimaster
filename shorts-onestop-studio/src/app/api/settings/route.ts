import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { loadSettings, saveSettings } from "@/lib/store";
import type { AiProvider } from "@/lib/models";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  try { const g = await guard(request); if (g instanceof NextResponse) return g; return json({ settings: await loadSettings(g.userId) }); }
  catch (e) { return fail(e); }
}

export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    await saveSettings(g.userId, { provider: g.body.provider as AiProvider, model: String(g.body.model ?? "") });
    return json({ settings: await loadSettings(g.userId) });
  } catch (e) { return fail(e); }
}
