// 볼타 웹훅 수신(2026-11-13, 플랜 docs/PLAN_20261113_U14_AND_DEFERRED.md §2-5 웹훅) — 회원 전용 비밀 주소 /api/bolta/webhook/<토큰>.
// 볼타가 로그인 없이 부른다. 토큰(해시)으로 회원을 찾고, 그 회원이 등록한 서명 키(공용 user_api_keys bolta_webhook_secret)로
// Standard Webhooks 서명을 확인한 뒤에만 그 회원의 세금계산서 문서에 결과(발급됨·실패 사유)를 기록한다.
import { NextResponse, type NextRequest } from "next/server";
import { initRuntime } from "@/server/runtime";
import { withRequestCache } from "@/litpage/server/db.ts";
import { boltaWebhookOwner, handleBoltaWebhook } from "@/server/boltaWebhook";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const raw = await request.text(); // 서명은 원문으로 확인한다(JSON으로 바꾸기 전)
  if (raw.length > 256 * 1024) return NextResponse.json({ ok: false }, { status: 413, headers: NO_STORE });
  initRuntime();
  const userId = withRequestCache(() => boltaWebhookOwner(token));
  if (!userId) return NextResponse.json({ ok: false }, { status: 404, headers: NO_STORE });
  const h = { id: request.headers.get("webhook-id"), timestamp: request.headers.get("webhook-timestamp"), signature: request.headers.get("webhook-signature") };
  const r = await withRequestCache(() => handleBoltaWebhook(userId, h, raw));
  // 2026-11-13 진단: 처리 결과와 서명 머리글의 모양만 남긴다(키·서명 값·본문은 남기지 않음)
  const parts = (h.signature ?? "").split(" ").filter(Boolean);
  console.warn(`[bolta-webhook] result=${r.result} status=${r.status} hasId=${!!h.id} tsSkewSec=${h.timestamp ? Math.round(Date.now() / 1000 - Number(h.timestamp)) : "none"} sigParts=${parts.length} sigVersions=${parts.map((p) => p.split(",")[0]).join("|")} bodyLen=${raw.length}`);
  return NextResponse.json({ ok: r.status === 200 }, { status: r.status, headers: NO_STORE });
}

/** 볼타가 주소를 등록할 때 HEAD로 확인한다 — 200으로 답한다(2026-11-13, 처음엔 405였음) */
export function HEAD() {
  return new NextResponse(null, { status: 200, headers: NO_STORE });
}
