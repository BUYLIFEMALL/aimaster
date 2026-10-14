import { NextResponse, type NextRequest } from "next/server";
import { guardAi, json, fail } from "@/lib/aiRoute";
import { testKey } from "@/lib/gemini";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 240;
export async function POST(request: NextRequest) { try { const g = await guardAi(request); if (g instanceof NextResponse) return g; await testKey(g.apiKey); return json({ ok: true, message: "본인 Gemini 키가 정상 동작합니다. 이미지 모델은 별도의 사용 권한·결제 설정이 필요할 수 있습니다." }); } catch (e) { return fail(e); } }
