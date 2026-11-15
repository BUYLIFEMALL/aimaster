// M2-11(2026-11-15) 택배 배송 조회 링크 — 택배사 이름 + 송장 번호 → 조회 화면 주소(순수 함수, 단위 시험)
// 2026-11-15 각 택배사 공식 사이트에서 송장 번호로 바로 열리는 주소를 확인함(CJ·롯데·로젠·경동·대신).
// 한진·우체국은 예전 주소가 더 이상 결과를 보여 주지 않아, 목록에 없는 택배사와 함께 네이버 「택배사 송장번호」 검색(택배 조회 상자)으로 연결한다.

const DIRECT: Record<string, (no: string) => string> = {
  CJ대한통운: (no) => `https://trace.cjlogistics.com/next/tracking.html?wblNo=${no}`,
  롯데택배: (no) => `https://www.lotteglogis.com/home/reservation/tracking/linkView?InvNo=${no}`,
  로젠택배: (no) => `https://www.ilogen.com/web/personal/trace/${no}`,
  경동택배: (no) => `https://kdexp.com/service/delivery/etc/delivery.do?barcode=${no}`,
  대신택배: (no) => `https://www.ds3211.co.kr/freight/internalFreightSearch.ht?billno=${no}`,
};

/** 택배사 이름의 흔한 다른 표기를 목록 이름으로 */
function canonicalCourier(name: string): string {
  const n = name.replace(/\s/g, "");
  if (/^(cj|씨제이)/i.test(n) || n === "대한통운") return "CJ대한통운";
  if (/^롯데/.test(n)) return "롯데택배";
  if (/^로젠/.test(n)) return "로젠택배";
  if (/^경동/.test(n)) return "경동택배";
  if (/^대신/.test(n)) return "대신택배";
  if (/^한진/.test(n)) return "한진택배";
  if (/^(우체국|우편)/.test(n)) return "우체국택배";
  return name.trim();
}

/** 조회 주소 — 송장 번호가 없으면 null */
export function trackingUrl(courier: string | null | undefined, trackingNo: string | null | undefined): string | null {
  const no = String(trackingNo ?? "").replace(/[^0-9A-Za-z]/g, "");
  if (!no || no.length > 40) return null;
  const name = canonicalCourier(String(courier ?? ""));
  const direct = DIRECT[name];
  if (direct) return direct(encodeURIComponent(no));
  return `https://search.naver.com/search.naver?query=${encodeURIComponent(`${name || "택배"} ${no}`)}`;
}
