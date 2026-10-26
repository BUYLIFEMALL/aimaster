import { NextResponse } from "next/server";
import { verifyExtensionToken } from "@/lib/extensionAuth";
import { createServiceClient } from "@/lib/supabase/service";
import { MOLIT_TRADE_URL, parseTradeResponse, recentMonths, similarAptNames, summarizeTrades, type Trade, topAptNames } from "@/lib/trades";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;

// 실거래가 비교(2026-10-25, v1.19). 확장이 「단지 이름 + 시·군·구 코드(5자리)」만 보낸다 — 회원 매물(호가·중개사)은 받지 않는다(§0).
// 국토교통부 아파트 매매 실거래가(공공 데이터)를 최근 6개월 조회해 단지·면적대별 ㎡당 중간값만 돌려준다. 저장하지 않는다.
// 키: 회원 본인 data_go_kr_service_key → 없으면 운영자 공용 DATA_GO_KR_SERVICE_KEY(주인님 승인 2026-10-25, TOP_RULE §8 — 무료 공공 데이터 예외).
const MONTHS = 6;
const MAX_TARGETS = 30;
const MAX_LAWD = 10;

type Target = { key: string; name: string; lawd: string };

async function fetchMonth(serviceKey: string, lawd: string, ym: string): Promise<{ trades: Trade[]; error?: string }> {
  const sk = serviceKey.includes("%") ? serviceKey : encodeURIComponent(serviceKey); // 「인코딩 키」를 넣은 회원도 그대로 쓰게
  const url = `${MOLIT_TRADE_URL}?serviceKey=${sk}&LAWD_CD=${lawd}&DEAL_YMD=${ym}&pageNo=1&numOfRows=1000`;
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10000) });
    const text = await res.text();
    // 403: 이 키로 「국토교통부_아파트 매매 실거래가 자료」(15126469) 활용신청이 안 됐거나 승인 전(2026-10-25 실물 확인)
    if (res.status === 403) return { trades: [], error: "공공데이터 응답 403 — 이 키로 「국토교통부_아파트 매매 실거래가 자료」 활용신청(승인)이 필요해요" };
    if (!res.ok) return { trades: [], error: `공공데이터 응답 ${res.status}` };
    return parseTradeResponse(text);
  } catch (e) {
    return { trades: [], error: e instanceof Error ? e.message : "공공데이터 요청 실패" };
  }
}

export async function POST(request: Request) {
  const user = await verifyExtensionToken(request);
  if (!user) return NextResponse.json({ error: "유효하지 않은 연동 토큰이거나 이용 권한이 없습니다." }, { status: 401 });

  const body = (await request.json().catch(() => null)) as { targets?: Target[] } | null;
  const targets = (body?.targets || [])
    .filter((t) => t && /^[0-9]{5}$/.test(String(t.lawd)) && typeof t.name === "string" && t.name.trim() && typeof t.key === "string")
    .slice(0, MAX_TARGETS)
    .map((t) => ({ key: String(t.key).slice(0, 40), name: t.name.trim().slice(0, 60), lawd: String(t.lawd) }));
  if (!targets.length) return NextResponse.json({ results: {}, keySource: null });

  const db = createServiceClient();
  const { data } = await db.from("user_api_keys").select("api_key").eq("user_id", user.userId).eq("provider", "data_go_kr_service_key").maybeSingle();
  const memberKey = typeof data?.api_key === "string" ? data.api_key.trim() : "";
  const serviceKey = memberKey || process.env.DATA_GO_KR_SERVICE_KEY?.trim() || "";
  if (!serviceKey) return NextResponse.json({ error: "no_key", message: "공공데이터 키가 없어 실거래 비교를 건너뛰었어요." }, { status: 200 });

  const lawds = [...new Set(targets.map((t) => t.lawd))].slice(0, MAX_LAWD);
  const months = recentMonths(new Date(), MONTHS);
  const byLawd = new Map<string, Trade[]>();
  const errors: string[] = [];
  for (const lawd of lawds) {
    const parts = await Promise.all(months.map((ym) => fetchMonth(serviceKey, lawd, ym)));
    byLawd.set(lawd, parts.flatMap((p) => p.trades));
    for (const p of parts) if (p.error && !errors.includes(p.error)) errors.push(p.error);
  }

  const results: Record<string, ReturnType<typeof summarizeTrades>> = {};
  for (const t of targets) {
    const trades = byLawd.get(t.lawd);
    if (trades) results[t.key] = summarizeTrades(trades, t.name);
  }
  // 진단(2026-10-26): 이름을 하나도 못 맞춘 지역은 거래 수와 국토부 단지 이름 예시를 돌려준다(공공 데이터, 회원 매물 아님)
  const diag = lawds.map((lawd) => ({ lawd, trades: byLawd.get(lawd)?.length ?? 0, names: topAptNames(byLawd.get(lawd) ?? []) }));
  // 진단 K(2026-10-26): 자료를 못 찾은 단지마다 글자가 많이 겹치는 국토부 단지 이름 후보(공공 데이터)
  const missed = targets
    .filter((t) => byLawd.has(t.lawd) && !results[t.key]?.bands?.length)
    .map((t) => ({ name: t.name, similar: similarAptNames(t.name, byLawd.get(t.lawd) ?? []) }));
  return NextResponse.json({ results, keySource: memberKey ? "member" : "operator", months, errors: errors.slice(0, 3), diag, missed });
}
