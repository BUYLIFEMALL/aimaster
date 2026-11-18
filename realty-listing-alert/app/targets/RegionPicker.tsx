"use client";

// 🏙 지역으로 추가(2026-10-25, 주인님 지시 「구단위 버튼식 지역 설정」) — 시·도 → 시·군·구 → 읍·면·동 버튼을 차례로 고른다.
// 동 하나를 감시 대상 1개로 저장하고, 확장이 그 동에서 매물 많은 단지 상위 N곳만 읽는다(요청 수를 줄이려고 동 단위).
import { useActionState, useEffect, useMemo, useState } from "react";
import { addRegionTargetAction, type TargetActionState } from "@/lib/actions/targets";
import { DEFAULT_REGION_MAX, REGION_MAX_OPTIONS, type RegionSido } from "@/lib/regions";
import type { CrossSuggestion } from "@/lib/crossWatch";

export default function RegionPicker({ disabled, suggestions = [] }: { disabled: boolean; suggestions?: CrossSuggestion[] }) {
  const [regions, setRegions] = useState<RegionSido[] | null>(null);
  const [sido, setSido] = useState<string | null>(null);
  const [sgg, setSgg] = useState<string | null>(null);
  const [dong, setDong] = useState<string | null>(null);
  const [max, setMax] = useState<number>(DEFAULT_REGION_MAX);
  const [state, action, adding] = useActionState<TargetActionState, FormData>(addRegionTargetAction, {});

  useEffect(() => {
    let alive = true;
    fetch("/regions.json").then((r) => r.json()).then((d) => alive && setRegions(d)).catch(() => alive && setRegions([]));
    return () => { alive = false; };
  }, []);

  const sidoRow = useMemo(() => regions?.find((s) => s.c === sido) ?? null, [regions, sido]);
  const sggRow = useMemo(() => sidoRow?.g.find((g) => g.c === sgg) ?? null, [sidoRow, sgg]);
  const dongName = sggRow?.d.find((d) => d[0] === dong)?.[1];

  if (!regions) return <p className="card-caption">지역 목록을 불러오는 중…</p>;

  // 연계 3단계(2026-11-19): 실거래·상가에 켠 시군구를 제안 — 누르면 ①·②만 미리 골라 두고 ③ 동과 「추가」는 회원이 한다(자동 추가 없음)
  const picks = suggestions
    .map((s) => {
      const sd = regions.find((r) => r.c === s.sgg_cd.slice(0, 2));
      const g = sd?.g.find((x) => x.c === s.sgg_cd);
      return sd && g ? { ...s, sido: sd.c, name: g.n } : null;
    })
    .filter((x): x is CrossSuggestion & { sido: string; name: string } => x !== null);

  return (
    <div className="ra-region">
      {picks.length > 0 && (
        <div className="ra-region-cross">
          <p className="ra-region-step">🔗 다른 부동산 프로그램에서 켠 지역 — 누르면 아래에서 동만 고르면 돼요(자동으로 추가하지 않아요)</p>
          <div className="ra-region-grid">
            {picks.map((p) => (
              <button key={p.sgg_cd} type="button" className={`ra-region-btn ${sgg === p.sgg_cd ? "on" : ""}`} onClick={() => { setSido(p.sido); setSgg(p.sgg_cd); setDong(null); }}>
                {p.name} <small>({p.sources.join("·")})</small>
              </button>
            ))}
          </div>
        </div>
      )}
      <p className="ra-region-step">① 시·도</p>
      <div className="ra-region-grid">
        {regions.map((s) => (
          <button key={s.c} type="button" className={`ra-region-btn ${sido === s.c ? "on" : ""}`} onClick={() => { setSido(s.c); setSgg(null); setDong(null); }}>
            {s.n}
          </button>
        ))}
      </div>

      {sidoRow && (
        <>
          <p className="ra-region-step">② 시·군·구</p>
          <div className="ra-region-grid">
            {sidoRow.g.map((g) => (
              <button key={g.c} type="button" className={`ra-region-btn ${sgg === g.c ? "on" : ""}`} onClick={() => { setSgg(g.c); setDong(null); }}>
                {g.n}
              </button>
            ))}
          </div>
        </>
      )}

      {sggRow && (
        <>
          <p className="ra-region-step">③ 읍·면·동</p>
          <div className="ra-region-grid">
            {sggRow.d.map(([code, name]) => (
              <button key={code} type="button" className={`ra-region-btn ${dong === code ? "on" : ""}`} onClick={() => setDong(code)}>
                {name}
              </button>
            ))}
          </div>
        </>
      )}

      {dong && sggRow && (
        <form action={action} className="ra-region-confirm">
          <input type="hidden" name="cortarNo" value={dong} />
          <span>
            🏙 <b>{sggRow.n} {dongName}</b>에서 매물 많은 단지
            <select name="regionMax" value={max} onChange={(e) => setMax(Number(e.target.value))} aria-label="살펴볼 단지 수">
              {REGION_MAX_OPTIONS.map((n) => <option key={n} value={n}>{n}곳</option>)}
            </select>
            을 살펴봐요
          </span>
          <button className="primary" type="submit" disabled={adding || disabled}>{adding ? "추가 중..." : "이 지역 감시 추가"}</button>
          <small>단지가 많을수록 수집 시간이 길어지고 네이버 확인 화면 위험이 커져요. 처음엔 5곳을 권해요.</small>
        </form>
      )}
      {state.error && <p className="ra-msg ra-err" role="alert">{state.error}</p>}
      {state.success && <p className="ra-msg ra-ok" role="status">{state.success}</p>}
    </div>
  );
}
