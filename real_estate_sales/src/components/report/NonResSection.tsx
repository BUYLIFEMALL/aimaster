import { formatWon } from "@/lib/format";
import type { NonResReport, UseGroup } from "@/lib/realestate/nonres";

// RQ-B5 주소 리포트 2차(2026-11-05): 상가·건물·토지 필지의 국토부 거래 요약. 「리포트 보기」와 「저장한 리포트」가 함께 쓴다.

const ppy = (v: number | null | undefined) => (v ? `${Math.round(v).toLocaleString("ko-KR")}만` : "-");
const dayLabel = (d: string) => (/^\d{8}$/.test(d) ? `${d.slice(0, 4)}.${d.slice(4, 6)}.${d.slice(6, 8)}` : d);

function GroupTable({ rows, first }: { rows: UseGroup[]; first: string }) {
  if (!rows.length) return <p className="text-sm text-mx-muted">이 기간에 신고된 거래가 없어요.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="mx-table w-full text-sm">
        <thead>
          <tr>
            <th>{first}</th>
            <th className="text-right">건수</th>
            <th className="text-right">평당가 중간값</th>
            <th className="text-right">범위</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 10).map((g) => (
            <tr key={`${g.label}-${g.scope}`}>
              <td className="whitespace-nowrap">
                {g.label}
                {g.scope === "시군구" && <span className="ml-1 text-xs text-mx-muted">(시군구 참고)</span>}
              </td>
              <td className="text-right tabular-nums">{g.count}건</td>
              <td className="text-right tabular-nums">{g.median !== null ? ppy(g.median) : <span className="text-xs text-mx-muted">표본 5건 미만</span>}</td>
              <td className="whitespace-nowrap text-right tabular-nums text-mx-muted">{g.min !== null ? `${ppy(g.min)}~${ppy(g.max)}` : "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function NonResSection({ n }: { n: NonResReport }) {
  return (
    <>
      <div className="mx-card space-y-3 p-5">
        <h2 className="mx-section-title">🏬 상가·건물 거래 (최근 {n.buildingMonths}개월)</h2>
        <h3 className="text-sm font-bold text-mx-text">같은 지번{n.jibun ? `(${n.dong} ${n.jibun})` : ""} 거래 {n.sameLot.length}건</h3>
        {n.sameLot.length ? (
          <div className="overflow-x-auto">
            <table className="mx-table w-full text-sm">
              <thead>
                <tr>
                  <th>계약일</th>
                  <th>구분 · 용도</th>
                  <th className="text-right">층</th>
                  <th className="text-right">금액</th>
                  <th className="text-right">면적</th>
                  <th className="text-right">평당가</th>
                </tr>
              </thead>
              <tbody>
                {n.sameLot.map((d, i) => (
                  <tr key={i}>
                    <td className="whitespace-nowrap">{dayLabel(d.day)}</td>
                    <td className="whitespace-nowrap">{d.buildingType ?? "-"} · {d.category}</td>
                    <td className="text-right">{d.floor || "-"}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{formatWon(d.amount)}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{d.area ? `${d.area}㎡` : "-"}</td>
                    <td className="whitespace-nowrap text-right tabular-nums">{ppy(d.perPyeong)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-mx-muted">같은 지번으로 잡힌 거래가 없어요. 통건물(일반 건물)은 국토부가 지번 일부를 가려서 필지로 맞출 수 없어요.</p>
        )}
        <h3 className="pt-2 text-sm font-bold text-mx-text">같은 동({n.dong || "알 수 없음"}) 구분·용도별</h3>
        <GroupTable rows={n.buildingGroups} first="구분 · 용도" />
        <p className="text-xs text-mx-muted">평당가는 건물면적 기준이에요. 집합(구분 상가)과 일반(통건물)은 면적 기준이 달라 따로 봐야 해요. 지분·취소 거래는 뺐어요.</p>
      </div>
      <div className="mx-card space-y-3 p-5">
        <h2 className="mx-section-title">🌳 토지 거래 (최근 {n.landMonths}개월)</h2>
        <GroupTable rows={n.landGroups} first="지목" />
        <p className="text-xs text-mx-muted">토지는 국토부가 지번을 가려 같은 필지 거래를 알 수 없어요. 같은 동에 5건 이상인 지목은 동 값, 아니면 시군구 값(참고)을 보여 줘요. 호출 한도 때문에 최근 {n.landMonths}개월만 봐요.</p>
      </div>
    </>
  );
}

export function ReportMap({ point }: { point: { x: number; y: number } }) {
  return (
    <div className="mx-card overflow-hidden p-0">
      {/* eslint-disable-next-line @next/next/no-img-element -- 서버가 넘겨 주는 브이월드 정적 지도(키 비노출) */}
      <img src={`/api/report-map?x=${point.x.toFixed(6)}&y=${point.y.toFixed(6)}`} alt="이 필지 위치 지도" loading="lazy" className="block h-auto w-full" width={640} height={360} />
      <p className="px-4 py-2 text-[11px] text-mx-muted">
        지도: 브이월드(국토교통부) · 표시는 지번 중심 좌표예요 ·{" "}
        <a href={`https://map.naver.com/p?c=${point.x.toFixed(6)},${point.y.toFixed(6)},17,0,0,0,dh`} target="_blank" rel="noreferrer" className="text-mx-link underline">네이버 지도에서 보기 ↗</a>
      </p>
    </div>
  );
}
