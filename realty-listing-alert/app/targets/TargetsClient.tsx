"use client";

import { useActionState, useState, useTransition } from "react";
import { addTargetAction, deleteTargetAction, toggleTargetAction, updateTargetAction, type TargetActionState } from "@/lib/actions/targets";
import { MAX_TARGETS, TRADE_TYPES } from "@/lib/targets";
import RegionPicker from "./RegionPicker";

export type TargetRow = {
  id: string;
  complex_no: string | null;
  complex_name: string | null;
  target_type: string;
  cortar_no: string | null;
  region_name: string | null;
  region_max_complexes: number;
  trade_types: string[];
  price_min: number | null;
  price_max: number | null;
  area_min: number | null;
  area_max: number | null;
  enabled: boolean;
};

function Conditions({ target }: { target?: TargetRow }) {
  const selected = target?.trade_types ?? ["A1", "B1", "B2"];
  return (
    <>
      <div className="field">
        <label>거래 종류</label>
        <div className="ra-chips">
          {TRADE_TYPES.map((t) => (
            <label key={t.code} className="ra-chip">
              <input type="checkbox" name="tradeTypes" value={t.code} defaultChecked={selected.includes(t.code)} /> {t.label}
            </label>
          ))}
        </div>
      </div>
      <div className="ra-grid">
        <div className="field"><label>가격 최소(만 원)</label><input name="priceMin" inputMode="numeric" placeholder="예: 30000" defaultValue={target?.price_min ?? ""} /></div>
        <div className="field"><label>가격 최대(만 원)</label><input name="priceMax" inputMode="numeric" placeholder="비우면 제한 없음" defaultValue={target?.price_max ?? ""} /></div>
        <div className="field"><label>전용면적 최소(㎡)</label><input name="areaMin" inputMode="decimal" placeholder="예: 59" defaultValue={target?.area_min ?? ""} /></div>
        <div className="field"><label>전용면적 최대(㎡)</label><input name="areaMax" inputMode="decimal" placeholder="비우면 제한 없음" defaultValue={target?.area_max ?? ""} /></div>
      </div>
    </>
  );
}

function Message({ state }: { state: TargetActionState }) {
  if (state.error) return <p className="ra-msg ra-err" role="alert">{state.error}</p>;
  if (state.success) return <p className="ra-msg ra-ok" role="status">{state.success}</p>;
  return null;
}

function TargetItem({ target }: { target: TargetRow }) {
  const [state, action, saving] = useActionState(updateTargetAction, {});
  const [pending, startTransition] = useTransition();
  const isRegion = target.target_type === "region";
  const name = isRegion ? `🏙 ${target.region_name ?? target.cortar_no}` : target.complex_name || `단지 ${target.complex_no}`;
  return (
    <li className={`ra-item ${target.enabled ? "" : "off"}`}>
      <div className="ra-item-head">
        <div>
          <strong>{name}</strong>
          {isRegion ? (
            <small className="ra-region-note">이 동에서 매물 많은 단지 {target.region_max_complexes}곳을 살펴봐요</small>
          ) : (
            <a href={`https://new.land.naver.com/complexes/${target.complex_no}`} target="_blank" rel="noreferrer">네이버 부동산에서 보기 ↗</a>
          )}
        </div>
        <div className="ra-item-actions">
          <button type="button" className={`ra-toggle ${target.enabled ? "on" : ""}`} disabled={pending} onClick={() => startTransition(() => toggleTargetAction(target.id, !target.enabled))}>
            {target.enabled ? "감시 ON" : "감시 OFF"}
          </button>
          <button type="button" className="ra-delete" disabled={pending} onClick={() => { if (window.confirm(`${name}을(를) 감시 대상에서 지울까요?`)) startTransition(() => deleteTargetAction(target.id)); }}>
            삭제
          </button>
        </div>
      </div>
      <details>
        <summary>조건 바꾸기</summary>
        <form action={action}>
          <input type="hidden" name="id" value={target.id} />
          <Conditions target={target} />
          <button className="secondary" type="submit" disabled={saving}>{saving ? "저장 중..." : "조건 저장"}</button>
          <Message state={state} />
        </form>
      </details>
    </li>
  );
}

type Prefill = { name: string; region: string } | null;

// 실거래 프로그램에서 넘어온 단지 — 네이버 부동산에서 그 단지를 열어 주소를 복사하도록 안내
function PrefillGuide({ prefill }: { prefill: NonNullable<Prefill> }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(prefill.name);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="ra-import">
      <p>
        <b>🏢 부동산 실거래 투자분석</b>에서 고른 단지 <b>「{prefill.name}」</b>{prefill.region ? ` (${prefill.region})` : ""}를 감시하려고 해요.
        <br />
        <small>네이버 부동산에서 이 단지를 검색해 단지 화면을 연 뒤, 주소창의 주소를 복사해 아래 첫 칸에 붙여 넣어 주세요.</small>
      </p>
      <div className="ra-actions">
        <button type="button" className="secondary" onClick={copy}>{copied ? "✅ 단지명 복사됨" : "단지명 복사"}</button>
        <a className="secondary" href="https://new.land.naver.com/" target="_blank" rel="noopener noreferrer">네이버 부동산 열기 ↗</a>
      </div>
    </div>
  );
}

export default function TargetsClient({ initialTargets, prefill = null }: { initialTargets: TargetRow[]; prefill?: Prefill }) {
  const [state, action, adding] = useActionState(addTargetAction, {});
  const full = initialTargets.length >= MAX_TARGETS;
  return (
    <>
      <section className="card">
        <h2 className="card-title">➕ 단지 추가 <span className="card-caption">{initialTargets.length} / {MAX_TARGETS}</span></h2>
        {full ? (
          <p className="ra-msg ra-warn">감시 대상이 {MAX_TARGETS}개로 가득 찼어요. 새 단지를 넣으려면 아래에서 하나를 지워 주세요.</p>
        ) : (
          <>
            {prefill && <PrefillGuide prefill={prefill} />}
            {/* 가장 쉬운 방법(UX 리뉴얼 C, 2026-10-25): 네이버 단지 화면 위 확장 버튼으로 추가 */}
            <div className="ra-easy">
              <a className="ra-naver-btn big" href="https://new.land.naver.com/" target="_blank" rel="noopener noreferrer">🏠 네이버 부동산에서 단지 찾기 ↗</a>
              <ol className="ra-easy-steps">
                <li><span className="ra-easy-ico">🔍</span><strong>1. 단지 검색</strong><small>열린 네이버 부동산 검색창에 단지 이름을 넣어요</small></li>
                <li><span className="ra-easy-ico">👆</span><strong>2. 단지 누르기</strong><small>목록·지도에서 단지를 눌러 매물 목록을 열어요</small></li>
                <li><span className="ra-easy-ico">➕</span><strong>3. 초록 버튼</strong><small>화면 오른쪽 아래 「➕ 매물 알림에 추가」를 누르면 끝!</small></li>
              </ol>
              <p className="card-caption">💡 추가한 뒤 이 화면을 새로고침하면 아래 목록에 보여요. 버튼이 안 보이면 크롬 확장이 설치·연결됐는지 대시보드 「🚀 시작하기」를 확인하세요.</p>
            </div>
            <details className="ra-manual" open>
              <summary>🏙 지역(시·구·동)으로 추가하기</summary>
              <RegionPicker disabled={full} />
            </details>
            <details className="ra-manual" open={!!prefill}>
              <summary>✏️ 주소로 직접 추가하기</summary>
              <form action={action} key={initialTargets.length}>
                <div className="ra-grid">
                  <div className="field"><label htmlFor="complex">네이버 부동산 단지 주소</label><input id="complex" name="complex" required placeholder="단지 화면 주소를 붙여 넣으세요" /></div>
                  <div className="field"><label htmlFor="complexName">알아보기 쉬운 이름(선택)</label><input id="complexName" name="complexName" maxLength={100} placeholder="예: 백송건영" defaultValue={prefill?.name ?? ""} /></div>
                </div>
                <details className="ra-more">
                  <summary>⚙️ 조건 더 정하기(선택) — 거래 종류·가격·면적</summary>
                  <Conditions />
                </details>
                <button className="primary" type="submit" disabled={adding}>{adding ? "추가 중..." : "감시 대상에 추가"}</button>
              </form>
            </details>
          </>
        )}
        <Message state={state} />
      </section>

      <section className="card">
        <h2 className="card-title">📋 감시 중인 단지</h2>
        {initialTargets.length === 0 ? (
          <p className="lede">아직 등록한 단지가 없어요. 위에서 첫 단지를 추가해 보세요.</p>
        ) : (
          <ul className="ra-list">{initialTargets.map((t) => <TargetItem key={t.id} target={t} />)}</ul>
        )}
      </section>
    </>
  );
}
