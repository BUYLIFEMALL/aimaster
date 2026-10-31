"use client";

import { useActionState } from "react";
import { addTargetAction, deleteTargetAction, saveScheduleAction, updateTargetAction, type WatchState } from "@/lib/actions/watchTargets";
import { kindsText } from "@/lib/watchTargets";

const initial: WatchState = {};
const input = "mx-input min-h-[40px] py-2 text-sm";
const check = "flex min-h-[40px] items-center gap-2 rounded-lg border border-mx-border bg-white px-3 text-sm text-mx-text";

function Note({ s }: { s: WatchState }) {
  return (
    <>
      {s.error && <p className="mt-2 text-sm text-mx-danger">{s.error}</p>}
      {s.success && <p className="mt-2 text-sm text-mx-success">{s.success}</p>}
    </>
  );
}

export function AddTargetForm() {
  const [s, action, pending] = useActionState(addTargetAction, initial);
  return (
    <form action={action}>
      <div className="grid gap-2 md:grid-cols-[3fr_1fr_auto]">
        <input name="url" required className={input} placeholder="https://new.land.naver.com/offices?ms=…&a=SG" aria-label="네이버 지도 주소" />
        <input name="name" className={input} placeholder="이름(예: 역삼동 상가)" aria-label="이름" />
        <button className="mx-btn-primary min-h-[40px] text-sm" disabled={pending}>
          {pending ? "추가 중..." : "주소로 추가"}
        </button>
      </div>
      <Note s={s} />
    </form>
  );
}

export interface TargetRow {
  id: string;
  name: string;
  url: string;
  kinds: string;
  trade_types: string[];
  price_min: number | null;
  price_max: number | null;
  area_min: number | null;
  area_max: number | null;
  enabled: boolean;
}

export function TargetCard({ t }: { t: TargetRow }) {
  const [s, action, pending] = useActionState(updateTargetAction, initial);
  return (
    <div className="mx-card">
      <form action={action}>
        <input type="hidden" name="id" value={t.id} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="mx-chip-green">{kindsText(t.kinds)}</span>
          <input name="name" defaultValue={t.name} aria-label="이름" className={`${input} max-w-xs flex-1`} />
          <label className={check}>
            <input type="checkbox" name="enabled" defaultChecked={t.enabled} /> 켜기
          </label>
          <a href={t.url} target="_blank" rel="noreferrer" className="text-sm font-semibold text-mx-link underline">
            네이버에서 보기
          </a>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-6">
          <label className={check}>
            <input type="checkbox" name="trades" value="A1" defaultChecked={t.trade_types.includes("A1")} /> 매매
          </label>
          <label className={check}>
            <input type="checkbox" name="trades" value="B2" defaultChecked={t.trade_types.includes("B2")} /> 월세
          </label>
          <input name="priceMin" className={input} defaultValue={t.price_min === null ? "" : t.price_min / 10000} placeholder="최소 금액(억)" aria-label="최소 금액(억)" />
          <input name="priceMax" className={input} defaultValue={t.price_max === null ? "" : t.price_max / 10000} placeholder="최대 금액(억)" aria-label="최대 금액(억)" />
          <input name="areaMin" className={input} defaultValue={t.area_min ?? ""} placeholder="최소 면적(㎡)" aria-label="최소 면적" />
          <input name="areaMax" className={input} defaultValue={t.area_max ?? ""} placeholder="최대 면적(㎡)" aria-label="최대 면적" />
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button className="mx-btn-primary min-h-[36px] text-sm" disabled={pending}>
            저장
          </button>
          <button formAction={deleteTargetAction} className="mx-btn-danger min-h-[36px] text-sm">
            지우기
          </button>
        </div>
        <Note s={s} />
      </form>
    </div>
  );
}

export function ScheduleForm({ p }: { p: { schedule_enabled?: boolean; interval_minutes?: number; active_hour_start?: number | null; active_hour_end?: number | null; listing_notify_new?: boolean; listing_notify_drop?: boolean; listing_notify_rise?: boolean; listing_notify_gone?: boolean } }) {
  const [s, action, pending] = useActionState(saveScheduleAction, initial);
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return (
    <form action={action}>
      <div className="grid gap-2 md:grid-cols-4">
        <label className={check}>
          <input type="checkbox" name="enabled" defaultChecked={p.schedule_enabled ?? false} /> 예약 켜기
        </label>
        <select name="interval" defaultValue={p.interval_minutes ?? 360} aria-label="간격" className={input}>
          <option value={60}>1시간마다</option>
          <option value={180}>3시간마다</option>
          <option value={360}>6시간마다(권장)</option>
          <option value={720}>12시간마다</option>
          <option value={1440}>하루 1번</option>
        </select>
        <select name="start" defaultValue={p.active_hour_start ?? ""} aria-label="시작 시각" className={input}>
          <option value="">시작 시각(제한 없음)</option>
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}시부터
            </option>
          ))}
        </select>
        <select name="end" defaultValue={p.active_hour_end ?? ""} aria-label="끝 시각" className={input}>
          <option value="">끝 시각(제한 없음)</option>
          {hours.map((h) => (
            <option key={h} value={h}>
              {h}시까지
            </option>
          ))}
        </select>
      </div>
      <p className="mb-2 mt-4 text-sm font-bold text-mx-text">무엇을 알려 드릴까요?</p>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <label className={check}>
          <input type="checkbox" name="new" defaultChecked={p.listing_notify_new ?? true} /> 🆕 새 매물
        </label>
        <label className={check}>
          <input type="checkbox" name="drop" defaultChecked={p.listing_notify_drop ?? true} /> 📉 가격 내림
        </label>
        <label className={check}>
          <input type="checkbox" name="rise" defaultChecked={p.listing_notify_rise ?? false} /> 📈 가격 오름
        </label>
        <label className={check}>
          <input type="checkbox" name="gone" defaultChecked={p.listing_notify_gone ?? false} /> 👋 사라짐
        </label>
      </div>
      <button className="mx-btn-primary mt-3 min-h-[40px] text-sm" disabled={pending}>
        저장
      </button>
      <Note s={s} />
    </form>
  );
}
