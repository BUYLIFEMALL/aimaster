"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveKakaoTemplatesAction } from "@/lib/actions/kakaoTemplates";

export interface KakaoTemplateData {
  sourcing_template_id: string | null;
  price_template_id: string | null;
}

export function KakaoTemplateSection({ templates }: { templates: KakaoTemplateData | null }) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSaving(true);
    try {
      const result = await saveKakaoTemplatesAction(new FormData(e.currentTarget));
      if (result.error) {
        setError(result.error);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 1500);
        router.refresh();
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-3 border-t border-gray-200 pt-4">
      <h2 className="text-sm font-bold text-gray-900">🔔 카카오 알림톡 템플릿 (선택)</h2>
      <p className="text-xs text-gray-500">
        <span className="font-semibold text-gray-700">SOLAPI 계정에 등록된 카카오 채널로 알림톡 받는 방법</span>
        <br />
        SOLAPI에서 발송 문구 전체를 담는 변수 1개(예: <code className="rounded bg-gray-100 px-1">#{"{내용}"}</code>)로
        구성한 템플릿을 만들어 승인받은 뒤, 템플릿 ID를 아래에 등록해주세요
        <br />
        친구톡과 달리 채널을 추가하지 않은 회원에게도 발송할 수 있는 정보성 메시지입니다.
      </p>

      <form onSubmit={handleSave} className="space-y-3 rounded-xl bg-gray-50 p-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">예약 소싱 알림용 템플릿 ID</label>
          <input
            name="sourcingTemplateId"
            defaultValue={templates?.sourcing_template_id ?? ""}
            placeholder="KA01TP..."
            className="input-sm w-full"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-gray-700">관심상품 변경 알림용 템플릿 ID</label>
          <input
            name="priceTemplateId"
            defaultValue={templates?.price_template_id ?? ""}
            placeholder="KA01TP..."
            className="input-sm w-full"
          />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {isSaving ? "저장 중..." : "저장"}
          </button>
          {saved && <span className="text-xs text-emerald-600">저장됐어요.</span>}
        </div>
      </form>
    </div>
  );
}
