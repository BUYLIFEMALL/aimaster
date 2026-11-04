import { formatWon } from "@/lib/format";
import { ymLabel } from "@/lib/realestate/insights";
import { riskBand } from "@/lib/realestate/report";
import { NonResSection, ReportMap } from "@/components/report/NonResSection";
import type { AddressReport } from "@/lib/realestate/reportData";

// B1 리포트 본문(2026-11-03). B2부터 「리포트 보기」와 「저장한 리포트」가 함께 쓴다 — 저장본은 거래 목록(trades) 없이 숫자만 담는다.
export type ReportSnapshot = Omit<AddressReport, "trades">;

const dayLabel = (d: string) => (/^\d{8}$/.test(d) ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}` : d);

function Fact({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-xl bg-mx-raised p-3">
      <dt className="text-xs text-mx-muted">{label}</dt>
      <dd className="mt-1 font-bold text-mx-text">{value}</dd>
      {note && <p className="mt-1 text-[11px] text-mx-muted">{note}</p>}
    </div>
  );
}

export function ReportBody({ r, nonResidential = false }: { r: ReportSnapshot; nonResidential?: boolean }) {
  const maxMonth = Math.max(1, ...r.sale.byMonth.map((m) => m.median));
  const noDeals = r.sale.count === 0 && r.jeonse.count === 0;
  return (
    <>
      {r.point && <ReportMap point={r.point} />}
      {r.nonres ? <NonResSection n={r.nonres} /> : nonResidential && <p className="mx-card px-4 py-3 text-sm text-mx-muted">상가·건물·토지 거래를 불러오지 못했어요. 아래 공시지가·용도지역·건물 정보만 보여 드려요.</p>}

      <div className="mx-card p-5">
        <h2 className="mx-section-title">💰 실거래 (매매)</h2>
        {r.sale.count === 0 ? (
          <p className="text-sm text-mx-muted">최근 {r.months}개월 동안 이 필지의 매매 신고가 없어요(자료 없음).</p>
        ) : (
          <>
            <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
              <Fact label="거래 건수" value={`${r.sale.count}건`} />
              <Fact label="중간값" value={formatWon(r.sale.median)} />
              <Fact label="범위" value={`${formatWon(r.sale.min)} ~ ${formatWon(r.sale.max)}`} />
              <Fact label="가장 최근" value={formatWon(r.sale.latest?.amount)} note={r.sale.latest ? `${dayLabel(r.sale.latest.day)} · ${r.sale.latest.floor || "-"}층${r.sale.latest.area ? ` · ${r.sale.latest.area}㎡` : ""}` : undefined} />
            </dl>
            <div className="mt-4 space-y-1">
              {r.sale.byMonth.map((m) => (
                <div key={m.ym} className="flex items-center gap-2 text-xs">
                  <span className="w-16 shrink-0 text-mx-muted">{ymLabel(m.ym)}</span>
                  <div className="h-3 flex-1 overflow-hidden rounded bg-mx-raised">
                    <div className="h-full rounded bg-mx-primary" style={{ width: `${Math.round((m.median / maxMonth) * 100)}%` }} />
                  </div>
                  <span className="w-28 shrink-0 text-right tabular-nums text-mx-text">{formatWon(m.median)} · {m.count}건</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="mx-card p-5">
        <h2 className="mx-section-title">🔑 전세·월세</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-4">
          <Fact label="전세 건수" value={r.jeonse.count ? `${r.jeonse.count}건` : "자료 없음"} />
          <Fact label="전세 중간값" value={r.jeonse.count ? formatWon(r.jeonse.median) : "-"} />
          <Fact
            label="전세가율"
            value={r.jeonseRatio !== null ? `${r.jeonseRatio}% · ${riskBand(r.jeonseRatio)}` : "-"}
            note={`전세 중간값 ÷ 매매 중간값${r.jeonseRatio !== null && r.jeonseRatio >= 70 ? " · 70% 이상 주의, 80% 이상 깡통전세 위험 구간" : ""}`}
          />
          <Fact label="월세 건수" value={`${r.monthlyCount}건`} />
        </dl>
      </div>

      <div className="mx-card p-5">
        <h2 className="mx-section-title">🏛️ 공시가격 · 토지</h2>
        <dl className="grid gap-3 text-sm sm:grid-cols-3">
          <Fact
            label="공동주택 공시가격"
            value={r.assessedPrice === "대상 아님" ? "대상 아님(오피스텔)" : r.assessedPrice ? formatWon(r.assessedPrice / 10000) : "자료 없음"}
            note={r.assessedPrice && r.assessedPrice !== "대상 아님" && r.sale.median ? `매매 중간값의 ${Math.round((r.assessedPrice / 10000 / r.sale.median) * 100)}%` : "면적이 맞는 세대 기준"}
          />
          <Fact label={`개별공시지가${r.land?.year ? ` (${r.land.year}년)` : ""}`} value={r.land?.pricePerM2 ? `${r.land.pricePerM2.toLocaleString("ko-KR")}원/㎡` : "자료 없음"} />
          <Fact label="용도지역" value={r.land?.zones.length ? r.land.zones.join(", ") : "자료 없음"} />
        </dl>
        {r.land?.allZones && (
          <details className="mt-2 text-xs text-mx-muted">
            <summary className="cursor-pointer">지구·구역 전체 보기</summary>
            <p className="mt-1">{r.land.allZones}</p>
          </details>
        )}
      </div>

      <div className="mx-card p-5">
        <h2 className="mx-section-title">🏢 건물 정보 (건축물대장)</h2>
        {r.building ? (
          <dl className="grid grid-cols-2 gap-3 text-sm lg:grid-cols-3">
            <Fact
              label="사용승인일"
              value={r.building.approvalDay ?? "-"}
              note={r.building.ageYears !== null ? `약 ${r.building.ageYears}년 차` : "사용승인일이 없어요 — 미사용승인 건물일 수 있으니 건축물대장을 확인하세요"}
            />
            <Fact label="용적률" value={r.building.floorAreaRatio ? `${r.building.floorAreaRatio}%` : "-"} />
            <Fact label="건폐율" value={r.building.coverageRatio ? `${r.building.coverageRatio}%` : "-"} />
            <Fact label="주차" value={r.building.parking ? `${r.building.parking}대` : "-"} note={r.building.households && r.building.parking ? `세대당 ${(r.building.parking / r.building.households).toFixed(2)}대` : undefined} />
            <Fact label="세대수" value={r.building.households ? `${r.building.households}세대` : "-"} />
            <Fact label="최고 층수" value={r.building.topFloor ? `${r.building.topFloor}층` : "-"} />
          </dl>
        ) : (
          <p className="text-sm text-mx-muted">자료 없음 — 건축물대장 조회가 되지 않았어요.</p>
        )}
        <p className="mt-2 text-xs text-mx-muted">
          이 리포트는 위반건축물 여부를 보여 주지 않아요. 정부24에서 「건축물대장」을 검색해 무료로 열람해 확인하세요:{" "}
          <a href="https://www.gov.kr" target="_blank" rel="noreferrer" className="text-mx-link underline">정부24 ↗</a>
        </p>
      </div>

      {noDeals && !nonResidential && (
        <p className="mx-card px-4 py-3 text-sm text-mx-muted">이 지번으로 신고된 거래가 없거나, 단지가 여러 지번에 걸쳐 대표 지번이 다를 수 있어요.</p>
      )}

      {r.errors.length > 0 && (
        <details className="mx-card p-4 text-xs text-mx-muted print:hidden">
          <summary className="cursor-pointer">⚠️ 일부 자료를 받지 못했어요 ({r.errors.length}건)</summary>
          <ul className="mt-2 list-disc space-y-1 pl-4">
            {r.errors.slice(0, 12).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </details>
      )}

      <p className="text-xs text-mx-muted">※ 국토교통부 실거래·전월세, 브이월드 공시가격·토지이용계획, 건축물대장(공공데이터포털) 자료를 모은 참고용 요약이에요. 투자 판단과 책임은 본인에게 있어요.</p>
    </>
  );
}
