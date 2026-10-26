// EC-W7(2026-10-26): 관세청_관세환율정보(GW) 응답(XML) 읽기 — 외부 호출·DB 없는 순수 함수(시험 대상).
// 공식 안내에 감싸는 요소 이름이 없어, 값만 있는 태그를 순서대로 읽고 통화부호(currSgn)가 다시 나오면 다음 줄로 끊는다.
// 응답 항목(공식 안내): resultCode·resultMsg·cntySgn·mtryUtNm(화폐단위명)·fxrt(환율)·currSgn(통화부호)·aplyBgnDt·imexTp(1 수출, 2 수입)

export type FxCurrency = "USD" | "CNY" | "JPY" | "EUR";
export const FX_CURRENCIES: FxCurrency[] = ["USD", "CNY", "JPY", "EUR"];
export const FX_LABELS: Record<FxCurrency, string> = { USD: "달러", CNY: "위안", JPY: "엔", EUR: "유로" };

export interface CustomsFxRow {
  currency: string;
  /** 1단위당 원화 */
  rateKrw: number;
  /** 관세청 원문 단위(100엔 표기면 100) */
  unit: number;
  /** YYYY-MM-DD */
  applyStart: string;
}

/** 화면에 넘기는 과세환율(1단위당 원화) */
export interface CustomsFxSnapshot {
  /** 1단위당 원화 */
  rates: Partial<Record<FxCurrency, number>>;
  /** 적용 시작일 YYYY-MM-DD */
  applyStart: string | null;
  fetchedAt: string | null;
}

export interface CustomsFxParse {
  resultCode: string | null;
  resultMsg: string | null;
  rows: CustomsFxRow[];
}

function ymdToIso(v: string): string | null {
  const d = v.replace(/\D/g, "");
  return d.length === 8 ? `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}` : null;
}

export function parseCustomsFxXml(xml: string): CustomsFxParse {
  let resultCode: string | null = null;
  let resultMsg: string | null = null;
  const records: Record<string, string>[] = [];
  let cur: Record<string, string> = {};
  for (const m of xml.matchAll(/<([A-Za-z][\w]*)>([^<]*)<\/\1>/g)) {
    const tag = m[1];
    const value = m[2].trim();
    if (tag === "resultCode") resultCode = value;
    else if (tag === "resultMsg") resultMsg = value;
    else if (["cntySgn", "mtryUtNm", "fxrt", "currSgn", "aplyBgnDt", "imexTp"].includes(tag)) {
      if (tag in cur) {
        records.push(cur);
        cur = {};
      }
      cur[tag] = value;
    }
  }
  if (Object.keys(cur).length) records.push(cur);

  const rows: CustomsFxRow[] = [];
  for (const r of records) {
    if (r.imexTp && r.imexTp !== "2") continue; // 수입 환율만
    const currency = (r.currSgn ?? "").toUpperCase();
    const raw = Number((r.fxrt ?? "").replace(/,/g, ""));
    const applyStart = ymdToIso(r.aplyBgnDt ?? "");
    if (!/^[A-Z]{3}$/.test(currency) || !Number.isFinite(raw) || raw <= 0 || !applyStart) continue;
    const unit = /\(?\s*100\s*\)?/.test(r.mtryUtNm ?? "") ? 100 : 1;
    rows.push({ currency, rateKrw: Math.round((raw / unit) * 10000) / 10000, unit, applyStart });
  }
  return { resultCode, resultMsg, rows };
}

/** 외화 금액 → 원화(반올림). 환율이 없으면 null */
export function toKrw(amount: number, rateKrw: number | undefined | null): number | null {
  if (!rateKrw || !Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * rateKrw);
}

/** 한국 시간 기준 오늘부터 n일 전 날짜를 YYYYMMDD로 */
export function kstYmdDaysAgo(n: number, now: Date = new Date()): string {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000 - n * 86400 * 1000);
  return kst.toISOString().slice(0, 10).replace(/-/g, "");
}
