// D32 몰 앱 아이콘(PNG) — 몰 로고가 있으면 로고, 없으면 몰 이름 첫 글자. 크기는 192·512·180(아이폰)만
import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { APPLE_ICON_SIZE, ICON_SIZES, appLogoOf, iconColor, iconInitial } from "@/lib/pwa";

export const dynamic = "force-dynamic";

/** 한 글자만 담은 글꼴(구글 글꼴, 실패하면 기본 글꼴) — 한글 첫 글자가 깨지지 않게 */
async function fontFor(ch: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@700&text=${encodeURIComponent(ch)}`, { cache: "force-cache" })).text();
    const url = css.match(/src: url\((.+?)\) format\('(opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url, { cache: "force-cache" })).arrayBuffer() : null;
  } catch {
    return null;
  }
}

export async function GET(_req: Request, { params }: { params: Promise<{ store: string; size: string }> }) {
  const { store: slug, size: raw } = await params;
  const size = Number(raw);
  if (![...ICON_SIZES, APPLE_ICON_SIZE].includes(size as never)) return new Response("bad size", { status: 400 });
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("name, settings").eq("slug", slug).maybeSingle();
  if (!store) return new Response("not found", { status: 404 });
  const name = store.name as string;
  const logo = appLogoOf(store.settings);
  const ch = iconInitial(name);
  const font = logo ? null : await fontFor(ch);
  const pad = Math.round(size * 0.12);
  return new ImageResponse(
    logo ? (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#ffffff" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logo} alt="" width={size - pad * 2} height={size - pad * 2} style={{ objectFit: "contain" }} />
      </div>
    ) : (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: iconColor(name), color: "#ffffff", fontSize: Math.round(size * 0.56), fontWeight: 700, fontFamily: font ? "KR" : undefined }}>
        {ch}
      </div>
    ),
    { width: size, height: size, fonts: font ? [{ name: "KR", data: font, weight: 700, style: "normal" }] : undefined, headers: { "cache-control": "public, max-age=3600" } },
  );
}
