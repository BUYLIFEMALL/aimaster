import { SettingsForm } from "@/components/recruit/SettingsForm";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function SettingsPage() {
  return <div className="mx-auto max-w-3xl space-y-4"><h1 className="text-2xl font-bold text-slate-900">⚙️ 모집 방식·설정</h1><p className="text-sm text-slate-600">처음 한 번만 정하면 됩니다. 같은 설정은 이 화면 한 곳에서만 바꿉니다.</p><SettingsForm /></div>;
}
