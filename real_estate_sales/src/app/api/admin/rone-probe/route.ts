import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// RQ-A4 0단계 사전 검증(2026-11-05, 플랜 docs/PLAN_20261105_RQ_A4_COMMERCIAL_RENT.md).
// 한국부동산원 R-ONE Open API를 운영 인증키(RONE_API_KEY, 공공 무료 자료)로 불러 상업용부동산 임대동향 표 번호·상권 코드·값을 찾는다.
// 관리자·운영 계정만, 읽기만. 서비스 이름과 요청 칸은 정해진 것만 넘기고, 키 값은 응답에 싣지 않는다.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = { from: (t: string) => any };
const PARAMS = ["STATBL_ID", "DTACYCLE_CD", "CLS_ID", "ITM_ID", "GRP_ID", "WRTTIME_IDTFR_ID", "START_WRTTIME", "END_WRTTIME", "pIndex", "pSize"];

export async function GET(req: Request) {
  const { data: auth } = await (await createClient()).auth.getUser();
  if (!auth.user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  const db = createAdminClient() as unknown as Loose;
  const { data: profile } = await db.from("profiles").select("is_admin, retention_exempt").eq("id", auth.user.id).maybeSingle();
  if (!profile?.is_admin && !profile?.retention_exempt) return NextResponse.json({ error: "관리자만 볼 수 있습니다." }, { status: 403 });

  const url = new URL(req.url);
  const service = url.searchParams.get("service") ?? "SttsApiTbl.do";
  if (!/^SttsApi[A-Za-z]{0,20}\.do$/.test(service)) return NextResponse.json({ error: "서비스 이름이 올바르지 않습니다." }, { status: 400 });
  const key = process.env.RONE_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "RONE_API_KEY가 없습니다." }, { status: 500 });

  const qs = new URLSearchParams({ KEY: key, Type: "json" });
  for (const p of PARAMS) {
    const v = url.searchParams.get(p);
    if (v) qs.set(p, v.slice(0, 40));
  }
  // 이름에 이 글자가 든 줄만 남김(통계표 769개에서 상가 표 찾기용)
  const grep = url.searchParams.get("grep")?.trim() ?? "";
  const started = Date.now();
  try {
    const res = await fetch(`https://www.reb.or.kr/r-one/openapi/${service}?${qs}`, { cache: "no-store" });
    const text = await res.text();
    let body: unknown = text.slice(0, 2000);
    try {
      body = JSON.parse(text);
    } catch {
      /* JSON이 아니면 앞부분만 */
    }
    if (grep && body && typeof body === "object") {
      const root = body as Record<string, unknown>;
      for (const v of Object.values(root)) {
        if (!Array.isArray(v)) continue;
        for (const part of v) {
          const rows = (part as { row?: Record<string, unknown>[] })?.row;
          if (Array.isArray(rows)) (part as { row: unknown[] }).row = rows.filter((r) => JSON.stringify(r).includes(grep));
        }
      }
    }
    return NextResponse.json({ service, http: res.status, ms: Date.now() - started, body });
  } catch (e) {
    return NextResponse.json({ service, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
  }
}
