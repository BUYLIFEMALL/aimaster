import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserGeminiApiKey } from "@/lib/apiKeys";
import { friendlyAiError, imageToDesign } from "@/lib/gemini";
import { normalizeAiComponents } from "@/lib/canvas/model";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;
const NO_STORE = { "Cache-Control": "private, no-store" };
const MAX_BASE64 = 4_000_000; // Vercel 요청 본문 한도(4.5MB) 안쪽
const MIME = new Set(["image/png", "image/jpeg", "image/webp"]);

export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });

  let body: { imageBase64?: unknown; mimeType?: unknown; canvas?: { width?: unknown; height?: unknown } } = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "요청 형식이 올바르지 않습니다." }, { status: 400, headers: NO_STORE }); }
  const data = typeof body.imageBase64 === "string" ? body.imageBase64 : "";
  const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
  if (!data || !MIME.has(mimeType)) {
    return NextResponse.json({ error: "PNG, JPG, WEBP 이미지만 사용할 수 있습니다." }, { status: 400, headers: NO_STORE });
  }
  if (data.length > MAX_BASE64) {
    return NextResponse.json({ error: "이미지가 너무 큽니다. 3MB 이하의 이미지를 사용해 주세요." }, { status: 413, headers: NO_STORE });
  }
  const width = Math.min(4000, Math.max(200, Math.round(Number(body.canvas?.width) || 1440)));
  const height = Math.min(4000, Math.max(200, Math.round(Number(body.canvas?.height) || 900)));

  const apiKey = await getUserGeminiApiKey(access.user.id);
  if (!apiKey) {
    return NextResponse.json(
      { error: "Gemini API 키가 등록되지 않았습니다. [API키등록·플랫폼연동]에서 본인의 Google Gemini API 키를 먼저 등록해 주세요.", needKey: true },
      { status: 400, headers: NO_STORE },
    );
  }
  try {
    const result = await imageToDesign(apiKey, { data, mimeType }, { width, height });
    const components = normalizeAiComponents(result.components, { width, height });
    if (components.length === 0) {
      return NextResponse.json({ error: "이미지에서 UI 요소를 찾지 못했습니다. 화면이 선명한 UI 스크린샷으로 다시 시도해 주세요." }, { status: 422, headers: NO_STORE });
    }
    return NextResponse.json({ spec: result.spec, components }, { headers: NO_STORE });
  } catch (error) {
    const e = friendlyAiError(error);
    return NextResponse.json({ error: e.message }, { status: e.status, headers: NO_STORE });
  }
}
