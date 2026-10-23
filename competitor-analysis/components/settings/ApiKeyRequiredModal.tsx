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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-mx-border bg-mx-surface p-6 shadow-xl">
        <h3 className="mb-2 text-lg font-bold text-mx-text">🔑 API 키 등록이 필요합니다</h3>
        <p className="mb-5 text-sm text-mx-muted">
          {label} 키가 없어서 분석을 진행할 수 없습니다. 설정 페이지에서 본인 키를 등록해주세요.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="mx-btn-ghost flex-1"
          >
            닫기
          </button>
          <Link
            href="/settings"
            className="mx-btn-primary flex-1"
          >
            설정으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
