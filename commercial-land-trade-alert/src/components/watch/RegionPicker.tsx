"use client";

// 지역으로 추가. 기준: realty-listing-alert/app/targets/RegionPicker.tsx
// 100. 골든 랜드 프롭테크 인텔리전스 HUD 테마 고대비 버튼 & 서피스 완비
import { startTransition, useActionState, useEffect, useMemo, useState } from "react";
import { addRegionTargetAction, type WatchState } from "@/lib/actions/watchTargets";
import { type AdminDongRow, searchAdminDongs } from "@/lib/adminDongs";
import { askExtension } from "@/lib/extensionBridge";

const MIN_EXTENSION = 1.11;

type Sido = { c: string; n: string; g: { c: string; n: string; d: [string, string][] }[] };

const KINDS: [string, string][] = [["SG", "상가"], ["GM", "건물"], ["TJ", "토지"]];

// 명시적인 고대비 색상 (White-on-White 절대 방지)
const btn = (on: boolean) =>
  `min-h-[44px] whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-bold transition-all ${
    on
      ? "border-amber-500 bg-amber-500/20 text-amber-400 shadow-md shadow-amber-500/10"
      : "border-[#1E293B] bg-[#0E1420] text-gray-200 hover:border-amber-500/50 hover:bg-[#161F30] hover:text-white"
  }`;

const grid = "grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2";
const stepTitle = "mb-2 mt-4 text-sm font-black text-amber-400 first:mt-0 flex items-center gap-1.5";

export function RegionPicker({ email, disabled }: { email: string; disabled: boolean }) {
  const [regions, setRegions] = useState<Sido[] | null>(null);
  const [sido, setSido] = useState<string | null>(null);
  const [sgg, setSgg] = useState<string | null>(null);
  const [dong, setDong] = useState<string | null>(null);
  const [kinds, setKinds] = useState<string[]>(["SG"]);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState("");
  const [state, action, adding] = useActionState<WatchState, FormData>(addRegionTargetAction, {});
  const [dongQuery, setDongQuery] = useState("");
  const [adminDongs, setAdminDongs] = useState<{ rows: AdminDongRow[]; asOf?: string; failed?: boolean }>({ rows: [] });

  useEffect(() => {
    let alive = true;
    fetch("/regions.json").then((r) => r.json()).then((d) => alive && setRegions(d)).catch(() => alive && setRegions([]));
    return () => { alive = false; };
  }, []);

  const sidoRow = useMemo(() => regions?.find((s) => s.c === sido) ?? null, [regions, sido]);
  const sggRow = useMemo(() => sidoRow?.g.find((g) => g.c === sgg) ?? null, [sidoRow, sgg]);
  const dongName = sggRow?.d.find((d) => d[0] === dong)?.[1];

  function searchDong(text: string) {
    setDongQuery(text);
    if (adminDongs.rows.length || adminDongs.failed) return;
    fetch("/admin-dongs.json").then((r) => r.json()).then((d) => setAdminDongs({ rows: d.rows, asOf: d.asOf })).catch(() => setAdminDongs({ rows: [], failed: true }));
  }
  const dongResults = useMemo(() => searchAdminDongs(adminDongs.rows, dongQuery), [adminDongs.rows, dongQuery]);
  function legalPlace(code: string) {
    const s = regions?.find((x) => x.c === code.slice(0, 2));
    const g = s?.g.find((x) => x.c === code.slice(0, 5));
    const d = g?.d.find((x) => x[0] === code);
    return s && g && d ? { sido: s.c, sgg: g.c, sggName: g.n, name: d[1] } : null;
  }

  async function add() {
    if (!dong || !kinds.length) return;
    setLocateError("");
    setLocating(true);
    const ping = await askExtension<{ ok?: boolean; version?: string; connected?: boolean }>("ping", 2000);
    if (!ping?.ok) {
      setLocating(false);
      setLocateError("확장이 응답하지 않습니다. 확장을 설치하고 chrome://extensions에서 ↻ 새로고침한 뒤 이 화면도 새로고침해 주세요.");
      return;
    }
    if ((Number.parseFloat(String(ping.version ?? "").replace("v", "")) || 0) < MIN_EXTENSION) {
      setLocating(false);
      setLocateError(`확장이 옛 버전(${ping.version || "알 수 없음"})입니다. chrome://extensions에서 ↻ 새로고침한 뒤 이 화면도 새로고침해 주세요.`);
      return;
    }
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

  if (!regions) return <p className="text-sm text-gray-400">지역 목록을 불러오는 중입니다...</p>;
  return (
    <div className="mt-3">
      <div className="mb-4 rounded-xl border border-[#1E293B] bg-[#0E1420] p-4 shadow-md">
        <label htmlFor="admin-dong" className="text-sm font-bold text-white">행정동 이름으로 찾기</label>
        <input id="admin-dong" value={dongQuery} onChange={(e) => searchDong(e.target.value)} placeholder="예: 노량진1동" className="mx-input mt-2 min-h-[44px] w-full" />
        <p className="mt-1.5 text-xs text-gray-400">네이버 매물과 실거래는 법정동 기준이에요. 행정동을 넣으면 등록할 법정동을 알려 드리며, 같은 법정동의 다른 행정동 매물도 함께 나올 수 있어요.</p>
        {adminDongs.failed && <p className="mt-2 text-sm text-rose-400" role="alert">행정동 자료를 불러오지 못했습니다. 화면을 새로고침해 주세요.</p>}
        {dongQuery.trim().length >= 2 && adminDongs.rows.length > 0 && dongResults.length === 0 && <p className="mt-2 text-sm text-gray-400">찾는 행정동이 없습니다. 이름을 확인하거나 아래에서 직접 골라 주세요.</p>}
        {dongResults.length > 0 && (
          <ul className="mt-3 space-y-2">
            {dongResults.map(([name, codes]) => (
              <li key={`${name}-${codes.join()}`} className="text-sm text-gray-200">
                <b className="text-white">{legalPlace(codes[0])?.sggName} {name}</b> → 법정동
                <span className="ml-2 inline-flex flex-wrap gap-1.5 align-middle">
                  {codes.map((code) => {
                    const p = legalPlace(code);
                    return p ? <button key={code} type="button" className={btn(dong === code)} onClick={() => { setSido(p.sido); setSgg(p.sgg); setDong(code); }}>{p.name}</button> : null;
                  })}
                </span>
              </li>
            ))}
          </ul>
        )}
        {adminDongs.asOf && <p className="mt-2 text-xs text-gray-500 font-mono">출처: 행정안전부 행정기관·관할구역 코드({adminDongs.asOf} 기준)</p>}
      </div>

      <p className={stepTitle}><span>📍</span> 1. 시·도</p>
      <div className={grid}>
        {regions.map((s) => (
          <button
            key={s.c}
            type="button"
            className={btn(sido === s.c)}
            onClick={() => {
              setSido(s.c);
              setSgg(null);
              setDong(null);
            }}
          >
            {s.n}
          </button>
        ))}
      </div>

      {sidoRow && (
        <>
          <p className={stepTitle}><span>🏢</span> 2. 시·군·구</p>
          <div className={grid}>
            {sidoRow.g.map((g) => (
              <button
                key={g.c}
                type="button"
                className={btn(sgg === g.c)}
                onClick={() => {
                  setSgg(g.c);
                  setDong(null);
                }}
              >
                {g.n}
              </button>
            ))}
          </div>
        </>
      )}

      {sggRow && (
        <>
          <p className={stepTitle}><span>🏘️</span> 3. 읍·면·동 (법정동 기준)</p>
          <div className={grid}>
            {sggRow.d.map(([code, name]) => (
              <button
                key={code}
                type="button"
                className={btn(dong === code)}
                onClick={() => setDong(code)}
              >
                {name}
              </button>
            ))}
          </div>
        </>
      )}

      {dong && sggRow && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-[#121824] p-5 shadow-xl">
          <p className="text-sm font-bold text-white">
            <span className="text-amber-400 font-black">{sggRow.n} {dongName}</span>에서 무엇을 볼까요?
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            {KINDS.map(([code, label]) => (
              <button
                key={code}
                type="button"
                aria-pressed={kinds.includes(code)}
                className={btn(kinds.includes(code))}
                onClick={() =>
                  setKinds((k) => (k.includes(code) ? k.filter((x) => x !== code) : [...k, code]))
                }
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={add}
              disabled={disabled || locating || adding || !kinds.length}
              className="btn-3d-gold min-h-[44px] px-5 text-sm font-black text-black"
            >
              {locating ? "네이버에서 위치 찾는 중..." : adding ? "추가 중..." : "이 지역 감시 추가"}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            동 중심의 지도 화면을 저장해 이웃 동 매물이 섞이거나 일부 빠질 수 있습니다. 「네이버에서 보기」로 범위를 확인해 주세요. 시세 비교를 위해 이 시·군·구의 실거래 수집도 함께 켜집니다.
          </p>
        </div>
      )}

      {locateError && <p className="mt-2 text-sm text-rose-400" role="alert">⚠️ {locateError}</p>}
      {state.error && <p className="mt-2 text-sm text-rose-400" role="alert">⚠️ {state.error}</p>}
      {state.success && <p className="mt-2 text-sm text-emerald-400 font-bold" role="status">✅ {state.success}</p>}
    </div>
  );
}
