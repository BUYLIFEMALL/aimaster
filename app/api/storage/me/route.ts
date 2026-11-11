// 내 저장공간 사용량·한도·보관 기간 — 메인 사이트와 모든 하위 프로그램(<이름>.buylife.xyz)의 위젯이 부른다.
// 로그인 쿠키(.buylife.xyz 공유)로 본인만 확인. 다른 회원 값은 돌려주지 않는다.
// POST { action: "measure" } = 본인 사용량 다시 계산(1분에 1번).
import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { getStorageSummary, remeasureIfStale, STORAGE_PAGE_URL, STORAGE_WARN_RATIO } from "@/lib/storage/memberStorage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function allowedOrigin(origin: string | null): string | null {
  if (!origin) return null;
  try {
    const host = new URL(origin).hostname;
    if (host === "buylife.xyz" || host.endsWith(".buylife.xyz") || host === "localhost") return origin;
  } catch {
    /* ignore */
  }
  return null;
}

function withCors(res: NextResponse, req: NextRequest) {
  const origin = allowedOrigin(req.headers.get("origin"));
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type");
    res.headers.set("Vary", "Origin");
  }
  res.headers.set("Cache-Control", "no-store");
  return res;
}

export async function OPTIONS(req: NextRequest) {
  return withCors(new NextResponse(null, { status: 204 }), req);
}

async function currentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function respond(req: NextRequest, measure: boolean) {
  const userId = await currentUserId();
  if (!userId) return withCors(NextResponse.json({ loggedIn: false }, { status: 401 }), req);
  const service = createServiceClient();
  let summary = await getStorageSummary(service, userId);
  if (measure && (await remeasureIfStale(service, userId, summary.measuredAt))) {
    summary = await getStorageSummary(service, userId);
  }
  return withCors(
    NextResponse.json({ loggedIn: true, ...summary, warnRatio: STORAGE_WARN_RATIO, upgradeUrl: STORAGE_PAGE_URL }),
    req,
  );
}

export async function GET(req: NextRequest) {
  return respond(req, false);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  return respond(req, body?.action === "measure");
}
