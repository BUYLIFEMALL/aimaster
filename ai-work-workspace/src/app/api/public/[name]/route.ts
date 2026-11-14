// 공개 페이지 1단계(2026-11-14, 플랜 docs/PLAN_20261114_STORAGE_AND_PUBLIC.md B): 로그인 없는 방문자가 「웹에 게시」된 페이지를 읽는 입구.
// 허용 명령·게시 여부·관리자 내리기·게시한 회원 이용 기간은 src/server/publicPages.ts가 확인한다. 회원 로그인 입구(/api/rpc)와 섞지 않는다.
import { NextResponse, type NextRequest } from "next/server";
import { handlePublicRpc } from "@/server/publicPages";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const runtime = "nodejs";

const HEADERS = { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex" };

export async function POST(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!/^application\/json\b/i.test(request.headers.get("content-type") ?? "")) {
    return NextResponse.json({ name: "ValidationError", message: "Expected application/json" }, { status: 415, headers: HEADERS });
  }
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return NextResponse.json({ name: "PermissionError", message: "Cross-site request blocked" }, { status: 403, headers: HEADERS });
  }
  const text = await request.text();
  if (text.length > 10_000) return NextResponse.json({ name: "ValidationError", message: "Request is too large" }, { status: 413, headers: HEADERS });
  let body: unknown = {};
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    return NextResponse.json({ name: "ValidationError", message: "Invalid JSON" }, { status: 400, headers: HEADERS });
  }
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || request.headers.get("x-real-ip") || "unknown";
  const r = await handlePublicRpc(name, body, ip);
  return NextResponse.json(r.body, { status: r.status, headers: HEADERS });
}
