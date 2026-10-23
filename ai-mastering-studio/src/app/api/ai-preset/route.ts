import { NextRequest, NextResponse } from "next/server";
import { requireAccessAndKey } from "@/lib/routeGuard";
import { generateJson } from "@/lib/llm";
import { DEFAULT_TEXT_MODEL, textModelById } from "@/lib/mastering/models";
import { aiPresetPrompt, cleanAiPreset } from "@/lib/mastering/params";

// 권한 확인 결과가 정적으로 캐시되지 않게 두 줄을 세트로 선언한다(CLAUDE.md 멀티테넌시 원칙 1).
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

/** POST — 원하는 사운드 설명 → 마스터링 설정값(회원 본인 키로 호출, 안전 범위로 보정) */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const request = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (request.length < 2) return NextResponse.json({ error: "원하는 사운드를 글로 적어 주세요. 예: 선명한 고음과 깊은 저음 펀치감이 있는 현대적인 K-Pop" }, { status: 400 });

  const modelId = typeof body?.textModel === "string" && textModelById(body.textModel) ? body.textModel : DEFAULT_TEXT_MODEL;
  const provider = textModelById(modelId)!.provider;
  const a = await requireAccessAndKey(provider);
  if (a.error) return a.error;

  const r = await generateJson(modelId, a.apiKey, aiPresetPrompt(request, new Date().getFullYear()));
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  const preset = cleanAiPreset(r.data);
  if (!preset) return NextResponse.json({ error: "AI가 설정값을 만들지 못했습니다. 원하는 소리를 조금 더 자세히 적어 다시 시도해 주세요." }, { status: 502 });
  return NextResponse.json({ ...preset, ms: r.ms });
}
