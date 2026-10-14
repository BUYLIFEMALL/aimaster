import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { MAX_SAVED_B64, deleteSaved, listSaved, saveComic } from "@/lib/saved";
import { isAspect, isPanelCount, styleById } from "@/lib/comic/options";
import { normalizeScript } from "@/lib/comic/script";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
const NO_STORE = { "Cache-Control": "private, no-store" };
const B64 = /^[A-Za-z0-9+/]+={0,2}$/;
const err = (error: string, status: number) => NextResponse.json({ error }, { status, headers: NO_STORE });

/** 서버 보관함 목록(서명된 임시 주소 1시간). 만료된 작품은 이때 지운다 */
export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return err(access.error, access.status);
  return NextResponse.json({ items: await listSaved(access.user.id) }, { headers: NO_STORE });
}

/** 회원이 [서버 보관함에 저장]을 누른 완성작 1장(바둑판 JPEG)과 대본을 저장한다 */
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return err(access.error, access.status);
  const raw = await request.text();
  if (raw.length > MAX_SAVED_B64 + 60_000) return err("이미지가 너무 큽니다.", 413);
  let b: Record<string, unknown> = {};
  try { b = JSON.parse(raw); } catch { return err("요청 형식이 올바르지 않습니다.", 400); }
  const image = typeof b.image === "string" ? b.image : "";
  if (image.length < 100 || image.length > MAX_SAVED_B64 || !B64.test(image)) return err("이미지 데이터가 올바르지 않습니다.", 400);
  if (!isPanelCount(b.panelCount)) return err("컷 수가 올바르지 않습니다.", 400);
  if (!isAspect(b.aspect)) return err("비율이 올바르지 않습니다.", 400);
  if (typeof b.styleId !== "string" || !styleById(b.styleId)) return err("그림 스타일이 올바르지 않습니다.", 400);
  const script = normalizeScript(b.script, b.panelCount);
  if (!script) return err("대본이 올바르지 않습니다.", 400);
  const episode = typeof b.episode === "number" && Number.isInteger(b.episode) && b.episode >= 1 && b.episode <= 99 ? b.episode : 1;
  const title = typeof b.title === "string" && b.title.trim() ? b.title.trim() : "4컷 만화";
  const saved = await saveComic(access.user.id, {
    base64: image, title, episode, panelCount: b.panelCount, aspect: b.aspect, styleId: b.styleId, script, retentionDays: b.retentionDays,
  });
  if (!saved) return err("서버 보관함에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.", 500);
  return NextResponse.json(saved, { headers: NO_STORE });
}

/** ?id=<id> 한 개 삭제 */
export async function DELETE(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return err(access.error, access.status);
  const ok = await deleteSaved(access.user.id, request.nextUrl.searchParams.get("id") ?? "");
  if (!ok) return err("삭제하지 못했습니다.", 404);
  return NextResponse.json({ success: true }, { headers: NO_STORE });
}
