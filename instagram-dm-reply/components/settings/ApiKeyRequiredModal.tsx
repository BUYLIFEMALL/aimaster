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
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
        <h3 className="text-lg font-bold text-gray-900 mb-2">API 키 등록이 필요합니다</h3>
        <p className="text-sm text-gray-500 mb-5">
          {label} 키가 없어서 진행할 수 없습니다. 설정 페이지에서 본인 키를 등록해주세요.
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200"
          >
            닫기
          </button>
          <Link
            href="/settings"
            className="flex-1 text-center px-4 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            설정으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
