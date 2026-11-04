import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { vworldAuthParams } from "@/lib/publicdata/client";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// RQ-B5 주소 리포트 위치 지도(2026-11-05). 브이월드 2D 정적 지도를 서버가 받아 그림만 넘긴다 — 키를 화면에 드러내지 않는다.
// 로그인 회원만. 공공 무료 키(예외 §8, 사전 검증: PNG 약 88KB·0.3초). 같은 좌표는 브라우저가 하루 동안 다시 쓰게 한다.
export async function GET(req: NextRequest) {
  const { data: auth } = await (await createClient()).auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const x = Number(req.nextUrl.searchParams.get("x"));
  const y = Number(req.nextUrl.searchParams.get("y"));
  if (!(x > 124 && x < 132 && y > 33 && y < 39.5)) return NextResponse.json({ error: "좌표가 올바르지 않습니다." }, { status: 400 });
  const { key, domain } = vworldAuthParams();
  const qs = new URLSearchParams({ service: "image", request: "getmap", key, domain, center: `${x.toFixed(6)},${y.toFixed(6)}`, crs: "epsg:4326", zoom: "17", size: "640,360", format: "png", basemap: "GRAPHIC", marker: "on" });
  const res = await fetch(`https://api.vworld.kr/req/image?${qs}`, { cache: "no-store" });
  const type = res.headers.get("content-type") ?? "";
  if (!res.ok || !type.includes("image")) return NextResponse.json({ error: "지도를 받지 못했습니다." }, { status: 502 });
  return new NextResponse(await res.arrayBuffer(), { headers: { "content-type": type, "cache-control": "private, max-age=86400" } });
}
