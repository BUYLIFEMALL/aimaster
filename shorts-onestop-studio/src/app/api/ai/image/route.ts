import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { getUserApiKeys } from "@/lib/apiKeys";
import { DEFAULT_IMAGE_MODEL, generateSceneImage, isImageModel, saveSceneImage, signPaths } from "@/lib/media";
import { IMAGE_STYLES, type ImageStyle } from "@/lib/script";
import { UserError } from "@/lib/errors";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 180;

// AI 배경 이미지 1장(회원 본인 Gemini 키, 9:16) → 본인 폴더 저장 → 임시 서명 주소
export async function POST(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const base = String(g.body.prompt ?? "").trim().slice(0, 900);
    if (base.length < 8) throw new UserError(400, "장면 설명을 먼저 만들거나 입력해 주세요.");
    const styleKey = (String(g.body.style ?? "photo") in IMAGE_STYLES ? String(g.body.style) : "photo") as ImageStyle;
    const character = String(g.body.character ?? "").slice(0, 300);
    const model = isImageModel(g.body.model) ? String(g.body.model) : DEFAULT_IMAGE_MODEL;
    const key = (await getUserApiKeys(g.userId, ["gemini"])).gemini;
    if (!key) throw new UserError(400, "AI 이미지는 Gemini API 키가 필요합니다. API키등록·플랫폼연동에서 본인 키를 등록해 주세요.", { needKey: true });
    const prompt = [base, character ? `Same recurring character: ${character}.` : "", `Style: ${IMAGE_STYLES[styleKey].prompt}.`,
      "If people appear, depict them as Korean (East Asian) unless the scene clearly needs otherwise.", "Vertical 9:16 composition with calm space for large overlay text. No text, letters, logos or watermarks anywhere."].filter(Boolean).join(" ");
    const path = await saveSceneImage(g.userId, await generateSceneImage(key, model, prompt));
    const urls = await signPaths(g.userId, [path]);
    return json({ path, src: urls[path], model });
  } catch (e) { return fail(e); }
}
