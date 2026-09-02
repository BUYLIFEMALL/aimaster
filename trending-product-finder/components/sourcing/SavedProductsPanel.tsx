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

function SavedProductRow({ product }: { product: SavedProductEntry }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function saveAlert(intervalMinutes: number, channels: AlertChannel[]) {
    setIsSaving(true);
    try {
      const formData = new FormData();
      formData.set("id", product.id);
      formData.set("intervalMinutes", String(intervalMinutes));
      channels.forEach((c) => formData.append("channels", c));
      await updateSavedProductAlertAction(formData);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
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
    const current = new Set(product.alertChannels as AlertChannel[]);
    if (current.has(channel)) current.delete(channel);
    else current.add(channel);
    saveAlert(product.alertIntervalMinutes, Array.from(current));
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

      <div className="mt-2 flex items-center gap-2">
        <span className="text-[11px] text-gray-500">확인 주기</span>
        <select
          value={product.alertIntervalMinutes}
          onChange={(e) => saveAlert(Number(e.target.value), product.alertChannels as AlertChannel[])}
          disabled={isSaving}
          className="input-sm text-xs"
        >
          {ALERT_INTERVAL_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {ALERT_CHANNEL_OPTIONS.map((c) => {
          const checked = product.alertChannels.includes(c.value);
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
        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting}
          className="ml-auto text-[11px] font-semibold text-red-500 hover:underline disabled:opacity-50"
        >
          {isDeleting ? "삭제 중..." : "삭제"}
        </button>
      </div>

      {product.lastCheckedAt && (
        <p className="mt-1.5 text-[11px] text-gray-400">
          마지막 확인: {new Date(product.lastCheckedAt).toLocaleString("ko-KR")}
        </p>
      )}
    </div>
  );
}

export function SavedProductsPanel({ products }: SavedProductsPanelProps) {
  if (products.length === 0) return null;

  return (
    <div className="space-y-3 rounded-2xl border-2 border-amber-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-base font-extrabold text-gray-900">⭐ 관심 상품 ({products.length})</p>
        <p className="mt-1 text-xs text-gray-500">
          찜해둔 상품마다 정한 주기로 가격·품절 여부를 다시 확인해, <span className="font-semibold text-gray-700">실제로 바뀐 경우에만</span> 선택한 채널로 알려드립니다.
        </p>
      </div>
      <div className="space-y-2">
        {products.map((p) => (
          <SavedProductRow key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
