"use client";

import { useActionState, useTransition } from "react";
import { addTargetAction, deleteTargetAction, toggleTargetAction, updateTargetAction, type TargetActionState } from "@/lib/actions/targets";
import { MAX_TARGETS, TRADE_TYPES } from "@/lib/targets";

export type TargetRow = {
  id: string;
  complex_no: string;
  complex_name: string | null;
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
  const name = target.complex_name || `단지 ${target.complex_no}`;
  return (
    <li className={`ra-item ${target.enabled ? "" : "off"}`}>
      <div className="ra-item-head">
        <div>
          <strong>{name}</strong>
          <a href={`https://new.land.naver.com/complexes/${target.complex_no}`} target="_blank" rel="noreferrer">네이버 부동산에서 보기 ↗</a>
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

export default function TargetsClient({ initialTargets }: { initialTargets: TargetRow[] }) {
  const [state, action, adding] = useActionState(addTargetAction, {});
  const full = initialTargets.length >= MAX_TARGETS;
  return (
    <>
      <section className="card">
        <h2 className="card-title">➕ 단지 추가 <span className="card-caption">{initialTargets.length} / {MAX_TARGETS}</span></h2>
        {full ? (
          <p className="ra-msg ra-warn">감시 대상이 {MAX_TARGETS}개로 가득 찼어요. 새 단지를 넣으려면 아래에서 하나를 지워 주세요.</p>
        ) : (
          <form action={action} key={initialTargets.length}>
            <div className="ra-grid">
              <div className="field"><label htmlFor="complex">단지 화면 주소 또는 단지 번호</label><input id="complex" name="complex" required placeholder="https://new.land.naver.com/complexes/10981" /></div>
              <div className="field"><label htmlFor="complexName">알아보기 쉬운 이름(선택)</label><input id="complexName" name="complexName" maxLength={100} placeholder="예: 백송건영" /></div>
            </div>
            <Conditions />
            <button className="primary" type="submit" disabled={adding}>{adding ? "추가 중..." : "감시 대상에 추가"}</button>
          </form>
        )}
        <Message state={state} />
        <p className="card-caption">💡 단지 화면을 연 채로 확장 팝업의 「이 단지 감시 추가」를 누르는 방법은 다음 업데이트(확장 수집 기능)에서 열립니다.</p>
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
