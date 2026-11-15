// D32 몰마다 앱 설명 파일 — 홈 화면에 그 몰 이름·아이콘으로 설치된다. 하위 도메인으로 들어오면 시작 주소가 「/」
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { appLogoOf, barColor, brandColor, buildManifest } from "@/lib/pwa";
import { getPublishedDesign } from "@/lib/store";
import { mallSlugFromHost } from "@/lib/host";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ store: string }> }) {
  const { store: slug } = await params;
  const supabase = await createClient();
  const { data: store } = await supabase.from("mall_builder_stores").select("id, slug, name, settings").eq("slug", slug).maybeSingle();
  if (!store) return new Response("not found", { status: 404 });
  const host = (await headers()).get("host");
  const onSubdomain = mallSlugFromHost(host, process.env.MALL_ROOT_DOMAIN) === store.slug;
  const logo = appLogoOf(store.settings);
  const design = await getPublishedDesign(store.id as string);
  // 아이콘 바탕색이 테마를 따르므로 버전에 대표색을 넣어 홈 화면 아이콘이 새로 받아지게 한다(S50)
  const version = Buffer.from(`${store.name}|${logo}|${brandColor(store.name as string, design)}`).toString("base64url").slice(-10);
  return new Response(JSON.stringify(buildManifest({ name: store.name as string, slug: store.slug as string, onSubdomain, version, themeColor: barColor(store.name as string, design) })), {
    headers: { "content-type": "application/manifest+json; charset=utf-8", "cache-control": "public, max-age=300" },
  });
}
