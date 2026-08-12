"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";

interface ApiKeyRequiredModalProps {
  missingLabels: string[];
  onClose: () => void;
}

// 관리자 공용 키로 폴백하지 않기로 했으므로(README "API 키 정책" 참고), 본인 키가
// 없는 상태로 생성을 시도하면 조용히 막지 않고 이 팝업으로 분명하게 안내한다.
export function ApiKeyRequiredModal({ missingLabels, onClose }: ApiKeyRequiredModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">API 키 등록이 필요합니다</h2>
        <p className="mb-4 text-sm text-neutral-600">
          이 기능을 쓰려면 본인의{" "}
          <span className="font-medium text-neutral-900">{missingLabels.join(", ")}</span> API
          키를 먼저 등록해야 합니다. 다른 사용자의 API 키는 공유되지 않으며, 각자 본인 키로만
          이용할 수 있습니다.
        </p>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            닫기
          </Button>
          <Link href="/settings">
            <Button type="button">설정하러 가기</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
