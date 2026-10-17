"use client";

import Link from "next/link";
import { PROVIDER_LABELS } from "@/lib/apiKeyLabels";
import type { ApiKeyProvider } from "@/types/database.types";

export function ApiKeyRequiredModal({
  provider,
  onClose,
}: {
  provider: string;
  onClose: () => void;
}) {
  const label = PROVIDER_LABELS[provider as ApiKeyProvider] ?? provider;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-ig-surface rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-lg font-bold text-ig-text mb-2">API 키 등록이 필요합니다</h3>
        <p className="text-sm text-ig-muted mb-5">
          {label} 키가 없어서 분석을 진행할 수 없습니다. 설정 페이지에서 본인 키를 등록해주세요.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-ig-muted bg-ig-raised hover:bg-ig-hover"
          >
            닫기
          </button>
          <Link
            href="/settings"
            className="flex-1 text-center px-4 py-2.5 rounded-full text-sm font-bold text-white bg-ig-primary hover:bg-ig-primary-hover"
          >
            설정으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
