import { RENT_KIND_LABEL, RENT_KINDS, NEAR_KM, type RentNearby } from "@/lib/realestate/commercialRent";

// RQ-A4 1단계(2026-11-06): 비주거 리포트의 「가까운 상권 임대료·공실률」. 상권 평균 참고값 — 이 건물 값이 아니다.
const rent = (v?: number) => (v == null ? "-" : `${v.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}천 원`);
const vac = (v?: number) => (v == null ? "-" : `${v.toLocaleString("ko-KR", { maximumFractionDigits: 1 })}%`);
// ㎡당 천 원 → 평당 만 원(3.3058㎡)
const perPyeong = (v?: number) => (v == null ? "" : ` (평당 약 ${(Math.round(v * 3.3058) / 10).toLocaleString("ko-KR", { maximumFractionDigits: 1 })}만 원)`);

export function CommercialRentSection({ c }: { c: RentNearby }) {
  const cols = [
    ...(c.near ? [{ head: `${c.near.name} (${c.near.km}km)`, v: c.near }] : []),
    ...(c.sido ? [{ head: `${c.sido.area} 평균`, v: c.sido }] : []),
    ...(c.nation ? [{ head: "전국 평균", v: c.nation }] : []),
  ];
  if (!cols.length) return null;
  const kinds = RENT_KINDS.filter((k) => cols.some((col) => col.v.rent[k] != null || col.v.vacancy[k] != null));
  return (
    <div className="mx-card space-y-3 p-5">
      <h2 className="mx-section-title">🏷️ 가까운 상권 임대료·공실률 ({c.quarterLabel})</h2>
      <p className="text-sm text-mx-text">
        {c.near ? (
          <>이 필지에서 <b>{c.near.km}km</b> 떨어진 상권 「<b>{c.near.area.replaceAll(">", " › ")}</b>」 기준이에요.</>
        ) : (
          <>{NEAR_KM}km 안에 조사 상권이 없어 시·도와 전국 평균만 보여 드려요.</>
        )}
      </p>
      <div className="overflow-x-auto">
        <table className="mx-table w-full text-sm">
          <thead>
            <tr>
              <th>유형</th>
              {cols.map((col) => (
                <th key={col.head} className="text-right">{col.head}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {kinds.map((k) => (
              <tr key={k}>
                <td className="whitespace-nowrap">{RENT_KIND_LABEL[k]}</td>
                {cols.map((col) => (
                  <td key={col.head} className="text-right tabular-nums">
                    <div className="whitespace-nowrap">㎡당 {rent(col.v.rent[k])}<span className="text-xs text-mx-muted">{perPyeong(col.v.rent[k])}</span></div>
                    <div className="whitespace-nowrap text-xs text-mx-muted">공실 {vac(col.v.vacancy[k])}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-mx-muted">
        한국부동산원 「상업용부동산 임대동향조사」의 상권 평균이라 이 건물의 실제 임대료·공실과는 달라요. 투자 판단은 현장 시세와 함께 보세요. 상권은 조사 지역 이름을 지도에서 찾은 위치로 고른 것이라 실제 상권 경계와 다를 수 있어요.
      </p>
    </div>
  );
}
