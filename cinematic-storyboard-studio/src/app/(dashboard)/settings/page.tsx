import { ApiKeySettings } from "@/components/settings/ApiKeySettings";
import { KeyRound } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-6 pb-12">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-black text-slate-100">
          <KeyRound size={22} className="text-amber-500" />
          API키등록·플랫폼연동
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          이 프로그램은 회원님 본인의 Google Gemini API 키로 직접 동작합니다. 키는 회원님의 개인 계정에만 안전하게 암호화 보관되며, 다른 회원이나 운영자가 대신 사용하지 않습니다.
        </p>
      </div>
      <ApiKeySettings />
    </div>
  );
}
