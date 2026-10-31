"use client";

// 지역으로 추가. 기준: realty-listing-alert/app/targets/RegionPicker.tsx
// 상가·건물·토지는 단지가 없어 동 중심 좌표로 네이버 지도 화면을 만든다. 좌표는 회원 PC의 확장이 네이버에서 받는다(서버는 네이버에 요청하지 않음).
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { addRegionTargetAction, type WatchState } from "@/lib/actions/watchTargets";
import { askExtension } from "@/lib/extensionBridge";

type Sido = { c: string; n: string; g: { c: string; n: string; d: [string, string][] }[] };

const KINDS: [string, string][] = [["SG", "상가"], ["GM", "건물"], ["TJ", "토지"]];
const btn = (on: boolean) => `min-h-[44px] rounded-xl border px-2 py-2 text-sm font-semibold ${on ? "border-mx-primary bg-mx-primary/10 text-mx-primary" : "border-mx-border bg-white text-mx-text hover:border-mx-primary"}`;
const grid = "grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2";
const stepTitle = "mb-2 mt-4 text-sm font-bold text-mx-text first:mt-0";

export function RegionPicker({ email, disabled }: { email: string; disabled: boolean }) {
  const [regions, setRegions] = useState<Sido[] | null>(null);
  const [sido, setSido] = useState<string | null>(null);
  const [sgg, setSgg] = useState<string | null>(null);
  const [dong, setDong] = useState<string | null>(null);
  const [kinds, setKinds] = useState<string[]>(["SG"]);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");
  const [state, action, adding] = useActionState<WatchState, FormData>(addRegionTargetAction, {});

  useEffect(() => {
    let alive = true;
    fetch("/regions.json").then((r) => r.json()).then((d) => alive && setRegions(d)).catch(() => alive && setRegions([]));
    return () => { alive = false; };
  }, []);

  const sidoRow = useMemo(() => regions?.find((s) => s.c === sido) ?? null, [regions, sido]);
  const sggRow = useMemo(() => sidoRow?.g.find((g) => g.c === sgg) ?? null, [sidoRow, sgg]);
  const dongName = sggRow?.d.find((d) => d[0] === dong)?.[1];

  async function add() {
    if (!dong || !kinds.length) return;
    setLocateError("");
    setLocating(true);
    const r = await askExtension<{ ok?: boolean; lat?: number; lon?: number; error?: string }>("locateDong", 60000, { email, cortarNo: dong });
    setLocating(false);
    if (!r?.ok || r.lat == null || r.lon == null) {
      setLocateError(r?.error || "확장의 응답이 없습니다. 확장을 설치·연결하고 새로고침한 뒤 다시 눌러 주세요.");
      return;
    }
    const fd = new FormData();
    fd.set("cortarNo", dong);
    fd.set("lat", String(r.lat));
    fd.set("lon", String(r.lon));
    fd.set("kinds", kinds.join(":"));
    startTransition(() => action(fd));
  }

  if (!regions) return <p className="text-sm text-mx-muted">지역 목록을 불러오는 중입니다...</p>;
  return (
    <div className="mt-3">
      <p className={stepTitle}>1. 시·도</p>
      <div className={grid}>
        {regions.map((s) => <button key={s.c} type="button" className={btn(sido === s.c)} onClick={() => { setSido(s.c); setSgg(null); setDong(null); }}>{s.n}</button>)}
      </div>
      {sidoRow && (
        <>
          <p className={stepTitle}>2. 시·군·구</p>
          <div className={grid}>
            {sidoRow.g.map((g) => <button key={g.c} type="button" className={btn(sgg === g.c)} onClick={() => { setSgg(g.c); setDong(null); }}>{g.n}</button>)}
          </div>
        </>
      )}
      {sggRow && (
        <>
          <p className={stepTitle}>3. 읍·면·동</p>
          <div className={grid}>
            {sggRow.d.map(([code, name]) => <button key={code} type="button" className={btn(dong === code)} onClick={() => setDong(code)}>{name}</button>)}
          </div>
        </>
      )}
      {dong && sggRow && (
        <div className="mt-4 rounded-xl border border-mx-primary bg-mx-primary/5 p-4">
          <p className="text-sm font-bold">{sggRow.n} {dongName}에서 무엇을 볼까요?</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {KINDS.map(([code, label]) => (
              <button key={code} type="button" aria-pressed={kinds.includes(code)} className={btn(kinds.includes(code))} onClick={() => setKinds((k) => (k.includes(code) ? k.filter((x) => x !== code) : [...k, code]))}>{label}</button>
            ))}
            <button type="button" onClick={add} disabled={disabled || locating || adding || !kinds.length} className="mx-btn-primary min-h-[44px] text-sm">
              {locating ? "네이버에서 위치 찾는 중..." : adding ? "추가 중..." : "이 지역 감시 추가"}
            </button>
          </div>
          <p className="mt-2 text-xs text-mx-muted">동 중심의 지도 화면을 저장해 이웃 동 매물이 섞이거나 일부 빠질 수 있습니다. 「네이버에서 보기」로 범위를 확인해 주세요. 시세 비교를 위해 이 시·군·구의 실거래 수집도 함께 켜집니다.</p>
        </div>
      )}
      {locateError && <p className="mt-2 text-sm text-mx-danger" role="alert">{locateError}</p>}
      {state.error && <p className="mt-2 text-sm text-mx-danger" role="alert">{state.error}</p>}
      {state.success && <p className="mt-2 text-sm text-mx-success" role="status">{state.success}</p>}
    </div>
  );
}
