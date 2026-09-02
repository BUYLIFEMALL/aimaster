"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteSavedProductAction, updateSavedProductAlertAction, type SavedProductEntry } from "@/lib/actions/savedProducts";
import { ALERT_INTERVAL_OPTIONS } from "@/lib/schedule";
import { ALERT_CHANNEL_OPTIONS, type AlertChannel } from "@/lib/constants";

interface SavedProductsPanelProps {
  products: SavedProductEntry[];
}

const PLATFORM_LABEL: Record<SavedProductEntry["platform"], string> = {
  aliexpress: "🌏 알리익스프레스",
  domeggook: "🏠 도매매",
  elevenst: "🏪 11번가",
};

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => h);

// real_estate_sales의 components/districts/MonitoringSettings.tsx와 동일한 예약 설정 UX —
// 켜짐 여부/확인 주기/동작 시간대를 각 항목을 건드릴 때마다 현재 상태 전체와 합쳐서 즉시 저장한다.
function SavedProductRow({ product }: { product: SavedProductEntry }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(product.alertEnabled);
  const [interval, setInterval_] = useState(product.alertIntervalMinutes);
  const [channels, setChannels] = useState<AlertChannel[]>(product.alertChannels as AlertChannel[]);
  const [hoursRestricted, setHoursRestricted] = useState(product.activeHourStart !== null && product.activeHourEnd !== null);
  const [startHour, setStartHour] = useState(product.activeHourStart ?? 9);
  const [endHour, setEndHour] = useState(product.activeHourEnd ?? 22);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saved, setSaved] = useState(false);

  function save(next: {
    enabled?: boolean;
    interval?: number;
    channels?: AlertChannel[];
    hoursRestricted?: boolean;
    startHour?: number;
    endHour?: number;
  }) {
    const merged = {
      enabled: next.enabled ?? enabled,
      interval: next.interval ?? interval,
      channels: next.channels ?? channels,
      hoursRestricted: next.hoursRestricted ?? hoursRestricted,
      startHour: next.startHour ?? startHour,
      endHour: next.endHour ?? endHour,
    };
    setIsSaving(true);
    const formData = new FormData();
    formData.set("id", product.id);
    formData.set("enabled", String(merged.enabled));
    formData.set("intervalMinutes", String(merged.interval));
    merged.channels.forEach((c) => formData.append("channels", c));
    formData.set("hoursRestricted", String(merged.hoursRestricted));
    formData.set("activeHourStart", String(merged.startHour));
    formData.set("activeHourEnd", String(merged.endHour));
    updateSavedProductAlertAction(formData)
      .then(() => {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 1500);
      })
      .finally(() => setIsSaving(false));
  }

  async function handleDelete() {
    setIsDeleting(true);
    try {
      const formData = new FormData();
      formData.set("id", product.id);
      await deleteSavedProductAction(formData);
      router.refresh();
    } finally {
      setIsDeleting(false);
    }
  }

  function toggleChannel(channel: AlertChannel) {
    const current = new Set(channels);
    if (current.has(channel)) current.delete(channel);
    else current.add(channel);
    const next = Array.from(current);
    setChannels(next);
    save({ channels: next });
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">{product.title}</p>
          <p className="text-xs text-gray-500">
            {PLATFORM_LABEL[product.platform]} · &quot;{product.keyword}&quot;
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
            product.lastStatus === "in_stock" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
          }`}
        >
          {product.lastStatus === "in_stock" ? "판매중" : "품절 추정"}
        </span>
      </div>

      <div className="mt-1.5 flex items-center justify-between">
        <p className="text-sm font-bold tabular-nums text-gray-900">
          {product.lastPriceKrw != null ? `${product.lastPriceKrw.toLocaleString()}원` : "가격정보없음"}
        </p>
        <a href={product.detailUrl} target="_blank" rel="noreferrer" className="text-xs font-semibold text-sky-600 hover:underline">
          🔗 상품 보기
        </a>
      </div>

      {/* 예약(모니터링) ON/OFF — 삭제하지 않고도 추적만 켜고 끌 수 있다 */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-200 pt-2.5">
        <span className="text-xs font-semibold text-gray-700">가격/품절 추적</span>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => {
            const next = !enabled;
            setEnabled(next);
            save({ enabled: next });
          }}
          className={`rounded-full px-3 py-1 text-[11px] font-bold transition-colors disabled:opacity-50 ${
            enabled ? "bg-amber-500 text-white" : "border border-gray-300 bg-white text-gray-400"
          }`}
        >
          {enabled ? "추적 ON" : "추적 OFF"}
        </button>
      </div>

      {enabled && (
        <div className="mt-2 space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] text-gray-500">확인 주기</span>
            <select
              value={interval}
              disabled={isSaving}
              onChange={(e) => {
                const next = Number(e.target.value);
                setInterval_(next);
                save({ interval: next });
              }}
              className="input-sm text-xs"
            >
              {ALERT_INTERVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="w-16 shrink-0 text-[11px] text-gray-500">동작 시간대</span>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                const next = !hoursRestricted;
                setHoursRestricted(next);
                save({ hoursRestricted: next });
              }}
              className={`rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                hoursRestricted ? "border-amber-400 bg-amber-50 text-amber-700" : "border-gray-300 bg-white text-gray-500"
              }`}
            >
              {hoursRestricted ? "특정 시간대만" : "종일"}
            </button>

            {hoursRestricted && (
              <div className="flex items-center gap-1.5 text-xs">
                <select
                  value={startHour}
                  disabled={isSaving}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setStartHour(next);
                    save({ startHour: next });
                  }}
                  className="input-sm text-xs"
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}시
                    </option>
                  ))}
                </select>
                <span className="text-gray-400">~</span>
                <select
                  value={endHour}
                  disabled={isSaving}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setEndHour(next);
                    save({ endHour: next });
                  }}
                  className="input-sm text-xs"
                >
                  {HOUR_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h}시
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {ALERT_CHANNEL_OPTIONS.map((c) => {
              const checked = channels.includes(c.value);
              return (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => toggleChannel(c.value)}
                  disabled={isSaving}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                    checked ? "border-amber-500 bg-amber-500 text-white" : "border-gray-300 bg-white text-gray-500"
                  }`}
                >
                  {c.label}
                </button>
              );
            })}
          </div>
          {saved && <p className="text-[11px] text-emerald-600">저장됐어요.</p>}
        </div>
      )}

      <div className="mt-2.5 flex items-center justify-between border-t border-gray-200 pt-2">
        {product.lastCheckedAt ? (
          <p className="text-[11px] text-gray-400">마지막 확인: {new Date(product.lastCheckedAt).toLocaleString("ko-KR")}</p>
        ) : (
          <span />
        )}
        <button type="button" onClick={handleDelete} disabled={isDeleting} className="text-[11px] font-semibold text-red-500 hover:underline disabled:opacity-50">
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>
    </div>
  );
}

export function SavedProductsPanel({ products }: SavedProductsPanelProps) {
  // 이전엔 저장된 상품이 0개면 이 섹션 자체를 숨겼는데, 그러면 회원이 한 번도 안 써봤을 때
  // "관심상품 예약 알림" 기능이 페이지에 있는지조차 알 수 없다는 문제가 있었다(실사용자가
  // "예약 기능이 안 보인다"고 보고해서 발견, 2026-09-03). 이제는 비어 있어도 항상 표시하고
  // 사용법을 안내한다.
  return (
    <div className="space-y-3 rounded-2xl border-2 border-amber-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-base font-extrabold text-gray-900">⭐ 관심 상품 예약 알림 {products.length > 0 && `(${products.length})`}</p>
        <p className="mt-1 text-xs text-gray-500">
          찜해둔 상품마다 정한 주기로 가격·품절 여부를 다시 확인해, <span className="font-semibold text-gray-700">실제로 바뀐 경우에만</span> 선택한 채널로 알려드립니다. 추적을 잠시 멈추고
          싶으면 삭제하지 않고 &quot;추적 OFF&quot;로 꺼둘 수 있어요.
        </p>
      </div>
      {products.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-3 text-xs text-amber-800">
          아직 찜해둔 상품이 없습니다. 위 검색 결과에서 <span className="font-semibold">&quot;⭐ 관심상품 저장&quot;</span> 버튼을 누르면
          여기에 나타납니다.
        </p>
      ) : (
        <div className="space-y-2">
          {products.map((p) => (
            <SavedProductRow key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}
