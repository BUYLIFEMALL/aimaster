// RE-B4(2026-10-30): 경기·인천 실거래 — 국토교통부 아파트 매매 실거래가(공공데이터포털 15126469, RTMSDataSvcAptTrade, 전국).
// 주소·요청 방식은 `realty-listing-alert/lib/trades.ts`와 같다(코드 복사, 서로 부르지 않음).
// 응답 한 줄을 지금의 서울 열린데이터 줄 모양(SeoulRtmsRow)으로 바꿔, 중복 키·PNU·건축물대장·공시가격·AI 분석·알림 코드를 그대로 쓴다.
// 순수 함수만 둔다(시험용, server-only 아님).
import type { SeoulRtmsRow } from "./client";

/** 시·군·구 → { 동 이름: 법정동 코드 뒤 5자리 } (legalDong.ts의 LEGAL_DONG을 부르는 쪽에서 넘김 — 시험·서버 둘 다 import 확장자 문제 없이 쓰려고) */
export type DongTable = Record<string, Record<string, string>>;

/** 동 이름 → 법정동 코드 뒤 5자리. 「남양읍 남양리」는 리 코드로(2026-10-31 표에 리 추가), 표에 없는 리는 읍·면 코드로 대신(그 필지 조회는 비어도 무해) */
export function legalDongCode(dongTable: DongTable, sggCd: string, umdNm: string): string {
  const table = dongTable[sggCd];
  if (!table) return "";
  const name = umdNm.trim().replace(/\s+/g, " ");
  return table[name] ?? table[name.split(" ")[0]] ?? "";
}

/** 지번 「1286」「25-9」「산12-1」 → { 산 여부, 본번, 부번 } (2026-10-30 실측: 국토부 응답에 bonbun·bubun 칸이 없고 jibun만 옴) */
export function splitJibun(jibun: string): { mountain: boolean; bun: string; ji: string } {
  const m = jibun.trim().match(/^(산\s*)?(\d+)(?:-(\d+))?$/);
  if (!m) return { mountain: false, bun: "", ji: "" };
  return { mountain: !!m[1], bun: String(Number(m[2])), ji: String(Number(m[3] ?? 0)) };
}

export const MOLIT_TRADE_URL = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";

/** 조회할 달 「yyyymm」 — 이번 달과 지난달(한국 시간). 실거래는 계약 후 30일 안에 신고돼 지난달 거래가 늦게 들어온다 */
export function molitMonths(now: Date = new Date()): string[] {
  const kst = new Date(now.getTime() + 9 * 3600 * 1000);
  return [0, 1].map((i) => {
    const d = new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth() - i, 1));
    return `${d.getUTCFullYear()}${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}

/** 응답 JSON에서 줄 배열(한 줄이면 객체로 오는 경우 포함) */
export function molitItems(json: unknown): Record<string, unknown>[] {
  const items = (json as { response?: { body?: { items?: { item?: unknown } | "" } } })?.response?.body?.items;
  const item = items && typeof items === "object" ? (items as { item?: unknown }).item : undefined;
  if (Array.isArray(item)) return item as Record<string, unknown>[];
  return item && typeof item === "object" ? [item as Record<string, unknown>] : [];
}

const str = (v: unknown) => (v === null || v === undefined ? "" : String(v).trim());

/** 국토부 한 줄 → 서울 줄 모양. 해제(취소)된 거래·금액/면적 없는 줄은 null */
export function molitItemToRow(it: Record<string, unknown>, sggNm: string, dongTable: DongTable = {}): SeoulRtmsRow | null {
  if (str(it.cdealType)) return null; // 해제 신고된 거래(「O」)는 버림
  const amount = str(it.dealAmount).replace(/[,\s]/g, "");
  const area = str(it.excluUseAr);
  const y = str(it.dealYear);
  const m = str(it.dealMonth).padStart(2, "0");
  const d = str(it.dealDay).padStart(2, "0");
  if (!amount || !Number(amount) || !area || !Number(area) || y.length !== 4) return null;
  const sggCd = str(it.sggCd);
  const umdNm = str(it.umdNm);
  // 응답에 umdCd·bonbun·bubun·landCd가 있으면 쓰고, 없으면(2026-10 실제 응답) 동 이름·지번에서 만든다
  const jb = splitJibun(str(it.jibun));
  const mountain = str(it.landCd) ? str(it.landCd) === "2" : jb.mountain;
  return {
    RCPT_YR: y,
    CGG_CD: sggCd,
    CGG_NM: sggNm,
    STDG_CD: str(it.umdCd) || legalDongCode(dongTable, sggCd, umdNm),
    STDG_NM: umdNm,
    LOTNO_SE: mountain ? "2" : "1", // 1=대지, 2=산
    LOTNO_SE_NM: mountain ? "산" : "대지",
    MNO: str(it.bonbun).replace(/^0+(?=\d)/, "") || jb.bun,
    SNO: str(it.bubun).replace(/^0+(?=\d)/, "") || jb.ji,
    BLDG_NM: str(it.aptNm),
    CTRT_DAY: `${y}${m}${d}`,
    THING_AMT: amount, // 만 원(서울 자료와 같은 단위)
    ARCH_AREA: area, // 전용면적 ㎡
    FLR: str(it.floor),
    ARCH_YR: str(it.buildYear),
  };
}

/** 응답들 → 서울 줄 모양 목록(계약일 최신순) */
export function molitRows(jsons: unknown[], sggNm: string, dongTable: DongTable = {}): SeoulRtmsRow[] {
  const rows = jsons.flatMap((j) => molitItems(j)).map((it) => molitItemToRow(it, sggNm, dongTable)).filter((r): r is SeoulRtmsRow => !!r);
  return rows.sort((a, b) => b.CTRT_DAY.localeCompare(a.CTRT_DAY));
}
