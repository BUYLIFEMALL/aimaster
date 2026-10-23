import Link from "next/link";
import { PROVIDER_LABELS } from "@/lib/apiKeys";
import type { ApiKeyProvider } from "@/types/database.types";

export function MissingApiKeyNotice({ missing }: { missing: ApiKeyProvider[] }) {
  if (missing.length === 0) return null;

  const labels = missing.map((p) => PROVIDER_LABELS[p]).join(", ");

  return (
    <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
      <span className="font-medium">{labels}</span> API 키가 등록되어 있지 않습니다. 이 페이지의 AI 생성
      기능을 쓰려면 본인의 API 키를 먼저 등록해야 합니다.{" "}
      <Link href="/settings" className="font-medium underline">
        API 키 설정하러 가기
      </Link>
    </div>
  );
}
