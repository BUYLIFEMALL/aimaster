import { NextResponse, type NextRequest } from "next/server";
import { fail, guard, json } from "@/lib/route";
import { UserError } from "@/lib/errors";
import { isPhotoProvider, photoKeys, savePhotoKey, searchBackgrounds } from "@/lib/photos";

// L-3 무료 사진 배경: GET = 등록된 사진 키 여부, POST search = 회원 본인 키로 검색(누를 때만 1회), POST save = 키 확인 뒤 공용 저장소에 저장
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 30;

export async function GET(request: NextRequest) {
  try {
    const g = await guard(request); if (g instanceof NextResponse) return g;
    const keys = await photoKeys(g.userId);
    return json({ registered: { pixabay: !!keys.pixabay, pexels: !!keys.pexels } });
  } catch (e) { return fail(e); }
}

export async function POST(request: NextRequest) {
  try {
    const g = await guard(request, 4_000); if (g instanceof NextResponse) return g;
    const b = g.body;
    if (!isPhotoProvider(b.provider)) throw new UserError(400, "사진 제공처를 골라 주세요.");
    const provider = b.provider;
    if (b.action === "save") {
      const key = typeof b.key === "string" ? b.key.trim() : "";
      if (key.length < 10 || key.length > 200 || /\s/.test(key)) throw new UserError(400, "API 키 형식이 올바르지 않습니다. 복사한 키를 그대로 붙여 넣어 주세요.");
      await searchBackgrounds(provider, key, "nature", "landscape", request.signal); // 맞는 키인지 한 번 검색해 보고 저장
      await savePhotoKey(g.userId, provider, key);
      return json({ saved: true });
    }
    if (b.action !== "search") throw new UserError(400, "요청이 올바르지 않습니다.");
    const query = typeof b.query === "string" ? b.query.trim().slice(0, 100) : "";
    if (!query) throw new UserError(400, "검색어를 넣어 주세요.");
    const key = (await photoKeys(g.userId))[provider];
    if (!key) throw new UserError(400, `${provider === "pixabay" ? "Pixabay" : "Pexels"} 본인 API 키가 없습니다. 아래에서 한 번 등록해 주세요.`, { needPhotoKey: true });
    return json({ photos: await searchBackgrounds(provider, key, query, b.aspect === "portrait" ? "portrait" : "landscape", request.signal) });
  } catch (e) { return fail(e); }
}
