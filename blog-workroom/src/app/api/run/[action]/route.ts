import { NextResponse, type NextRequest } from "next/server";
import { ACTIONS } from "@/lib/actions";
import { fail, guard, json } from "@/lib/route";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 300;

export async function POST(request: NextRequest, { params }: { params: Promise<{ action: string }> }) {
  const { action } = await params;
  const handler = Object.hasOwn(ACTIONS, action) ? ACTIONS[action] : undefined;
  if (!handler) return json({ error: "알 수 없는 작업입니다." }, 404);
  try {
    const g = await guard(request, action === "image.generate" ? 30_000_000 : 2_000_000);
    if (g instanceof NextResponse) return g;
    return json({ ok: true, result: await handler(g) });
  } catch (e) { return fail(e); }
}
