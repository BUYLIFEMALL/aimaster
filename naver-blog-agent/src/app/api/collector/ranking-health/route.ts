import { NextResponse } from "next/server";
import { checkProgramAccessApi } from "@/lib/access";
import { checkRankingHealth, type RankingHealth } from "@/lib/naverRanking";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// 랭킹 목록만 읽는 무료 점검이라도 화면을 열 때마다 네이버를 부르지 않도록 서버에서 30분 보관한다.
const CACHE_MS = 30 * 60_000;
let cached: { at: number; health: RankingHealth[] } | null = null;

export async function GET() {
  const access = await checkProgramAccessApi();
  if (!access.allowed) return NextResponse.json({ error: access.error }, { status: access.status });
  if (!cached || Date.now() - cached.at > CACHE_MS) {
    cached = { at: Date.now(), health: await checkRankingHealth() };
  }
  return NextResponse.json({ checkedAt: new Date(cached.at).toISOString(), health: cached.health });
}
