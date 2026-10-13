import { NextResponse, type NextRequest } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { getUserApiKey } from "@/lib/apiKeys";
import { resolveImages, type StockProvider } from "@/lib/images";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;
const NO_STORE = { "Cache-Control": "private, no-store" };
const PROVIDERS: StockProvider[] = ["unsplash", "pexels", "pixabay"];
const LABEL: Record<StockProvider, string> = { unsplash: "Unsplash", pexels: "Pexels", pixabay: "Pixabay" };

/** 회원 본인의 이미지 제공자 키로 키워드별 이미지 URL을 찾아 준다(키는 서버에서만 사용) */
export async function POST(request: NextRequest) {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status, headers: NO_STORE });
  let body: { provider?: unknown; keywords?: unknown } = {};
  try { body = await request.json(); } catch { /* 아래에서 처리 */ }
  const provider = PROVIDERS.find((p) => p === body.provider);
  if (!provider) return NextResponse.json({ error: "이미지 소스가 올바르지 않습니다." }, { status: 400, headers: NO_STORE });
  const keywords = Array.isArray(body.keywords)
    ? [...new Set(body.keywords.filter((k): k is string => typeof k === "string" && /^[a-z0-9,_-]{1,60}$/.test(k)))].slice(0, 12)
    : [];
  if (!keywords.length) return NextResponse.json({ urls: {}, failed: [] }, { headers: NO_STORE });
  const key = await getUserApiKey(access.user.id, provider);
  if (!key) {
    return NextResponse.json(
      { error: `${LABEL[provider]} API 키가 등록되지 않았습니다. [API키등록·플랫폼연동]에서 본인 키를 등록하거나 이미지 소스를 무료 임의 사진으로 바꿔 주세요.`, needKey: provider },
      { status: 400, headers: NO_STORE },
    );
  }
  try {
    return NextResponse.json(await resolveImages(provider, key, keywords), { headers: NO_STORE });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "invalid-key") return NextResponse.json({ error: `${LABEL[provider]} API 키가 올바르지 않습니다. 키를 다시 확인해 주세요.` }, { status: 400, headers: NO_STORE });
    if (msg === "rate") return NextResponse.json({ error: `${LABEL[provider]} 사용 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.` }, { status: 429, headers: NO_STORE });
    return NextResponse.json({ error: "이미지를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502, headers: NO_STORE });
  }
}
