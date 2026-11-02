"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteOnsitePhotoAction, deleteOnsitePropertyAction, moveOnsitePropertyAction, onsiteLandInfoAction, updateOnsitePropertyAction } from "@/lib/actions/onsite";
import { locateAdminDong } from "@/lib/onsite/locate";
import { findAddress } from "@/lib/onsite/address";
import { AUTO_ADDRESS_MAX_M, autoParcel } from "@/lib/onsite/geo";
import type { LandInfo } from "@/lib/realestate/collect";
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
    const { lat, lon } = center.current;
    const [place, hit] = await Promise.all([locateAdminDong(lat, lon), findAddress(lat, lon)]);
    const result = await moveOnsitePropertyAction(property.id, { lat, lon, ...place, ...autoParcel(hit) });
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
    pnu: property.pnu ?? null,
    jibun: property.jibun ?? null,
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
  const [hint, setHint] = useState("");
  const [land, setLand] = useState<LandInfo | null>(null);
  const [landMessage, setLandMessage] = useState("");
  const set =(key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm({ ...form, [key]: e.target.value });

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
    if (result.ok) router.refresh();
  }

  async function lookup() {
    setHint("가까운 건물을 찾는 중입니다");
    const hit = await findAddress(property.lat, property.lon);
    if (!hit) return setHint("150m 안에서 건물을 찾지 못했습니다. 지도에서 위치를 옮기거나 직접 적어 주세요.");
    setForm((f) => ({ ...f, address: hit.address, pnu: hit.pnu, jibun: hit.jibun }));
    setLand(null);
    const near = hit.distanceM > AUTO_ADDRESS_MAX_M ? " · 거리가 있어 근처 건물일 수 있으니 확인해 주세요" : "";
    // 공동주택에는 아파트·연립·다세대가 함께 들어 있어 유형은 회원이 고른다
    const apt = hit.apartment && !form.kind ? " · 공동주택(아파트·빌라)이라 아래 「유형」도 골라 주세요" : "";
    setHint(`가장 가까운 건물 약 ${hit.distanceM}m${hit.use ? ` · 용도 ${hit.use}` : ""}${near}${apt}. 맞으면 「저장」을 눌러 주세요.`);
  }

  async function showLand() {
    setLandMessage("공시지가와 용도지역을 불러오는 중입니다");
    const result = await onsiteLandInfoAction(property.id);
    setLandMessage(result.ok ? "" : result.error);
    if (result.ok) setLand(result.land);
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
        <input
          className={inputClass}
          value={form.address}
          // 직접 고쳐 쓰면 찾은 건물과 달라질 수 있어 지번을 떼어 낸다
          onChange={(e) => setForm({ ...form, address: e.target.value, pnu: null, jibun: null })}
          placeholder="사진 위치에서 찾은 도로명주소가 들어갑니다. 직접 고칠 수 있습니다."
        />
      </label>
      {form.jibun && (
        <div className="rounded-lg border border-mx-border bg-mx-raised p-3 text-sm">
          <p className="text-mx-text">🧭 지번 {form.jibun}</p>
          {form.pnu === property.pnu ? (
            <button type="button" className="mx-btn-ghost mt-2 min-h-[44px] w-full" onClick={() => void showLand()}>
              공시지가·용도지역 보기
            </button>
          ) : (
            <p className="mt-1 text-xs text-mx-muted">「저장」을 누르면 공시지가·용도지역을 볼 수 있습니다.</p>
          )}
          {landMessage && <p role="status" className="mt-1 text-xs text-mx-muted">{landMessage}</p>}
          {land && (
            <ul className="mt-2 space-y-1 text-xs text-mx-muted">
              <li>
                개별공시지가:{" "}
                {land.pricePerM2 ? `${land.pricePerM2.toLocaleString("ko-KR")}원/㎡ (평당 약 ${Math.round((land.pricePerM2 * 3.3058) / 10000).toLocaleString("ko-KR")}만 원)${land.priceStdrYear ? ` · ${land.priceStdrYear}년 기준` : ""}` : "자료 없음"}
              </li>
              <li>용도지역·지구: {land.useZones ?? "자료 없음"}</li>
              <li>출처: 국토교통부(브이월드). 집합건물은 대지 전체 기준이라 내 지분만큼 나눠 봐야 합니다.</li>
            </ul>
          )}
        </div>
      )}
      <div>
        <button type="button" className="mx-btn-ghost min-h-[44px] w-full" onClick={() => void lookup()}>
          📍 위치로 주소 찾기
        </button>
        {hint && <p role="status" className="mt-1 text-xs text-mx-muted">{hint}</p>}
      </div>
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
