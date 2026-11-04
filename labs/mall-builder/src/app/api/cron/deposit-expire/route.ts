// 몰 운영자 본인 cron-job.org가 10분마다 부르는 실행 주소 — 머리글의 몰 전용 토큰으로 그 몰의 기한 지난 입금 대기 주문만 취소한다.
// 로그인 세션 없이 공개 키로 DB 함수 mall_builder_expire_deposits(토큰 해시)만 부른다(서비스 키 없음). 토큰이 없거나 틀리면 401.
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/env";
import { bearerToken, hashRunToken } from "@/lib/depositScheduler";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function run(request: Request) {
  const token = bearerToken(request.headers.get("authorization"));
  if (!token) return Response.json({ error: "unauthorized" }, { status: 401 });

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("mall_builder_expire_deposits", { p_token_hash: hashRunToken(token) });
  if (error) {
    if (error.message.includes("invalid_token")) return Response.json({ error: "unauthorized" }, { status: 401 });
    return Response.json({ error: "failed" }, { status: 500 });
  }
  return Response.json(data);
}

export const GET = run;
export const POST = run;
