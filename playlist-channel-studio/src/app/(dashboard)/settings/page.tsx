import { ApiKeySettings } from "@/components/settings/ApiKeySettings";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-1 text-xl font-bold text-neutral-900">API키등록·플랫폼연동</h1>
      <p className="mb-6 text-sm text-neutral-500">이 프로그램은 회원님 본인의 API 키(Gemini 필수 권장, OpenAI·Claude 선택)로 동작합니다. 키는 본인 계정에만 저장되며 다른 회원이나 운영자가 대신 쓰지 않습니다.</p>
      <ApiKeySettings />
    </div>
  );
}
