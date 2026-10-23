"use client";

import Link from "next/link";

interface ApiKeyRequiredModalProps {
  missingLabels: string[];
  onClose: () => void;
}

// 관리자 공용 키로 폴백하지 않기로 했으므로, 본인 키가 없는 상태로 생성을 시도하면
// 조용히 막지 않고 이 팝업으로 분명하게 안내한다.
export function ApiKeyRequiredModal({ missingLabels, onClose }: ApiKeyRequiredModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-bold text-gray-800">🔑 API 키 등록이 필요합니다</h2>
        <p className="mb-4 text-sm text-gray-600">
          이 기능을 쓰려면 본인의{" "}
          <span className="font-semibold text-gray-900">{missingLabels.join(", ")}</span> API 키를
          먼저 등록해야 합니다. 다른 사용자의 API 키는 공유되지 않으며, 각자 본인 키로만 이용할 수
          있습니다.
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-700"
          >
            닫기
          </button>
          <Link
            href="/settings"
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            설정하러 가기
          </Link>
        </div>
      </div>
    </div>
  );
}
