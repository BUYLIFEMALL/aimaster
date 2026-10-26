import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { FX_CURRENCIES, kstYmdDaysAgo, parseCustomsFxXml, type CustomsFxSnapshot, type FxCurrency } from "./fxParse";
export type { CustomsFxSnapshot } from "./fxParse";

// EC-W7(2026-10-26): 관세청 과세환율(수입)을 공용 참고 표 customs_fx_rates에 저장하고 화면에 넘긴다.
// - 누가 조회해도 같은 무료 공공 자료 → 최상위 규칙 예외(운영자 키, 서버 환경변수 CUSTOMS_FX_SERVICE_KEY만).
//   기록: docs/TOP_RULE_PERSONAL_ACCOUNT_API.md §8.
// - 회원 요청마다 부르지 않는다: 저장값이 12시간 안이면 그대로 쓰고, 지났을 때만 한 번 새로 받는다(예약 작업 없음).
// - 키가 없거나 실패하면 마지막 저장값, 그것도 없으면 빈 값 → 화면은 회원이 환율을 직접 넣는다.

const ENDPOINT = "https://apis.data.go.kr/1220000/retrieveTrifFxrtInfo/getRetrieveTrifFxrtInfo";
const REFRESH_MS = 12 * 3600 * 1000;
const RETRY_GAP_MS = 30 * 60 * 1000;
let lastAttemptAt = 0; // 같은 서버 인스턴스에서 실패가 이어질 때 30분에 한 번만 다시 시도


function serviceKey(): string | null {
  const raw = process.env.CUSTOMS_FX_SERVICE_KEY?.trim();
  if (!raw) return null;
  // 「인코딩 키」를 넣어도 두 번 인코딩되지 않게 한 번 풀어 둔다
  try {
    return raw.includes("%") ? decodeURIComponent(raw) : raw;
  } catch {
    return raw;
  }
}

async function fetchWeek(key: string, ymd: string) {
  const params = new URLSearchParams({ serviceKey: key, aplyBgnDt: ymd, weekFxrtTpcd: "2", numOfRows: "200", pageNo: "1" });
  const res = await fetch(`${ENDPOINT}?${params.toString()}`, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`관세청 과세환율 응답 ${res.status}`);
  return parseCustomsFxXml(await res.text());
}

async function refresh(): Promise<void> {
  const key = serviceKey();
  if (!key) return;
  lastAttemptAt = Date.now();
  // 주간 환율은 적용 시작일(보통 일요일)로 조회되므로 오늘부터 7일 전까지 거슬러 찾는다
  for (let back = 0; back <= 7; back++) {
    const parsed = await fetchWeek(key, kstYmdDaysAgo(back));
    if (parsed.resultCode && parsed.resultCode !== "00") throw new Error(`관세청 과세환율 결과 코드 ${parsed.resultCode}`);
    if (!parsed.rows.length) continue;
    const fetchedAt = new Date().toISOString();
    const admin = createAdminClient();
    const { error } = await admin.from("customs_fx_rates").upsert(
      parsed.rows.map((r) => ({ currency: r.currency, apply_start: r.applyStart, rate_krw: r.rateKrw, unit: r.unit, fetched_at: fetchedAt })),
      { onConflict: "currency,apply_start" },
    );
    if (error) throw new Error(`과세환율 저장 실패: ${error.code ?? ""}`);
    return;
  }
}

async function readLatest(): Promise<CustomsFxSnapshot> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("customs_fx_rates")
    .select("currency, apply_start, rate_krw, fetched_at")
    .in("currency", FX_CURRENCIES)
    .order("apply_start", { ascending: false })
    .limit(20);
  if (error || !data?.length) return { rates: {}, applyStart: null, fetchedAt: null };
  const applyStart = data[0].apply_start;
  const rates: Partial<Record<FxCurrency, number>> = {};
  let fetchedAt: string | null = null;
  for (const r of data) {
    if (r.apply_start !== applyStart) continue;
    rates[r.currency as FxCurrency] = Number(r.rate_krw);
    if (!fetchedAt || r.fetched_at > fetchedAt) fetchedAt = r.fetched_at;
  }
  return { rates, applyStart, fetchedAt };
}

/** 소싱 화면용 — 실패해도 예외를 던지지 않는다(계산기는 환율 없이도 동작) */
export async function getCustomsFxSnapshot(): Promise<CustomsFxSnapshot> {
  try {
    let snap = await readLatest();
    const old = !snap.fetchedAt || Date.now() - new Date(snap.fetchedAt).getTime() > REFRESH_MS;
    if (old && Date.now() - lastAttemptAt > RETRY_GAP_MS && serviceKey()) {
      try {
        await refresh();
        snap = await readLatest();
      } catch (err) {
        console.error("[trending-product-finder] 과세환율 갱신 실패:", err instanceof Error ? err.message : "알 수 없는 오류");
      }
    }
    return snap;
  } catch {
    return { rates: {}, applyStart: null, fetchedAt: null };
  }
}
