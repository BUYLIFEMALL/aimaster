"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOnsitePhotoAction, deleteOnsitePropertyAction, moveOnsitePropertyAction, updateOnsitePropertyAction } from "@/lib/actions/onsite";
import { locateAdminDong } from "@/lib/onsite/locate";
import { ONSITE_KINDS, ONSITE_STATUSES, type OnsiteProperty, type OnsiteStatus } from "@/lib/onsite/types";
import { OnsiteMap } from "./OnsiteMap";

const inputClass = "w-full rounded-lg border border-mx-border bg-mx-raised px-3 py-2 text-sm text-mx-text";

export function MoveOnMap({ property, mapKey }: { property: OnsiteProperty; mapKey: string | null }) {
  const router = useRouter();
  const center = useRef({ lat: property.lat, lon: property.lon });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function confirm() {
    setSaving(true);
    setMessage("");
    const result = await moveOnsitePropertyAction(property.id, { ...center.current, ...(await locateAdminDong(center.current.lat, center.current.lon)) });
    setSaving(false);
    setMessage(result.ok ? "✅ 위치를 확정했습니다." : result.error);
    if (result.ok) router.refresh();
  }

  return (
    <div>
      <OnsiteMap mapKey={mapKey} center={property} picking onCenterChange={(c) => (center.current = c)} />
      <button type="button" className="mx-btn-ghost mt-2 min-h-[44px] w-full" disabled={saving} onClick={() => void confirm()}>
        {saving ? "저장하는 중입니다" : "📍 이 위치로 확정"}
      </button>
      {message && <p role="status" className="mt-1 text-sm text-mx-muted">{message}</p>}
    </div>
  );
}

export function PropertyForm({ property }: { property: OnsiteProperty }) {
  const router = useRouter();
  const [form, setForm] = useState({
    address: property.address ?? "",
    kind: property.kind ?? "",
    status: property.status,
    rating: property.rating ? String(property.rating) : "",
    floor: property.floor ?? "",
    unit: property.unit ?? "",
    memo: property.memo ?? "",
    visitedOn: property.visited_on,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    const result = await updateOnsitePropertyAction(property.id, {
      ...form,
      kind: (form.kind || null) as (typeof ONSITE_KINDS)[number] | null,
      rating: form.rating ? Number(form.rating) : null,
    });
    setSaving(false);
    setMessage(result.ok ? "✅ 저장했습니다." : result.error);
  }

  async function remove() {
    const result = await deleteOnsitePropertyAction(property.id);
    if (result.ok) router.push("/onsite");
    else setMessage(result.error);
  }

  return (
    <form onSubmit={(e) => void save(e)} className="mx-card flex flex-col gap-3 p-4">
      <label className="text-sm text-mx-muted">
        주소
        <input className={inputClass} value={form.address} onChange={set("address")} placeholder="자동 등록 준비 중입니다. 지금은 직접 적으실 수 있습니다." />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm text-mx-muted">
          상태
          <select className={inputClass} value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as OnsiteStatus })}>
            {Object.entries(ONSITE_STATUSES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-mx-muted">
          유형
          <select className={inputClass} value={form.kind} onChange={set("kind")}>
            <option value="">선택 안 함</option>
            {ONSITE_KINDS.map((k) => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-mx-muted">
          층
          <input className={inputClass} value={form.floor} onChange={set("floor")} />
        </label>
        <label className="text-sm text-mx-muted">
          호수
          <input className={inputClass} value={form.unit} onChange={set("unit")} />
        </label>
        <label className="text-sm text-mx-muted">
          별점
          <select className={inputClass} value={form.rating} onChange={set("rating")}>
            <option value="">없음</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{"⭐".repeat(n)}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-mx-muted">
          방문일
          <input type="date" className={inputClass} value={form.visitedOn} onChange={set("visitedOn")} required />
        </label>
      </div>
      <label className="text-sm text-mx-muted">
        메모
        <textarea className={inputClass} rows={4} value={form.memo} onChange={set("memo")} />
      </label>
      <button type="submit" className="mx-btn-primary min-h-[44px]" disabled={saving}>
        {saving ? "저장하는 중입니다" : "저장"}
      </button>
      {message && <p role="status" className="text-sm text-mx-muted">{message}</p>}
      {confirmDelete ? (
        <div className="flex gap-2">
          <button type="button" className="mx-btn-danger min-h-[44px] flex-1" onClick={() => void remove()}>
            사진까지 모두 지우기
          </button>
          <button type="button" className="mx-btn-ghost min-h-[44px]" onClick={() => setConfirmDelete(false)}>
            취소
          </button>
        </div>
      ) : (
        <button type="button" className="mx-btn-ghost min-h-[44px]" onClick={() => setConfirmDelete(true)}>
          이 임장 기록 지우기
        </button>
      )}
    </form>
  );
}

export function PhotoGrid({ photos }: { photos: { id: string; url: string | null }[] }) {
  const router = useRouter();
  const [armed, setArmed] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function remove(id: string) {
    const result = await deleteOnsitePhotoAction(id);
    setArmed(null);
    if (result.ok) router.refresh();
    else setMessage(result.error);
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
        {photos.map((p) => (
          <div key={p.id} className="overflow-hidden rounded-lg border border-mx-border">
            {p.url && (
              <a href={p.url} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.url} alt="임장 사진" className="aspect-square w-full object-cover" />
              </a>
            )}
            <button
              type="button"
              className={`min-h-[44px] w-full text-xs ${armed === p.id ? "font-bold text-mx-danger" : "text-mx-muted"}`}
              onClick={() => (armed === p.id ? void remove(p.id) : setArmed(p.id))}
            >
              {armed === p.id ? "한 번 더 누르면 지워집니다" : "사진 지우기"}
            </button>
          </div>
        ))}
      </div>
      {message && <p role="alert" className="mt-1 text-sm text-mx-danger">{message}</p>}
    </div>
  );
}
