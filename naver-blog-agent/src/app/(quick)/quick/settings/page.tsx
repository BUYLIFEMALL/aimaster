import { requireAccessScope } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsClient, KeyDetail } from "@/app/(dashboard)/settings/SettingsClient";
import { NaverAccountManager } from "@/components/NaverAccountManager";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function maskSecret(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 7)}${"•".repeat(8)}${key.slice(-4)}`;
}

// E-4: 간편 회원도 본인 AI 키·발행할 블로그를 등록할 수 있게 기존 설정 화면 컴포넌트를 그대로 쓴다.
export default async function QuickSettingsPage() {
  const { user } = await requireAccessScope();
  const { data } = await (createAdminClient() as any).from("user_api_keys").select("provider, api_key, updated_at").eq("user_id", user.id);
  const initialRegistered: string[] = (data || []).map((row: any) => row.provider);
  const initialDetails: KeyDetail[] = (data || []).map((row: any) => ({ provider: row.provider, maskedKey: maskSecret(row.api_key || ""), updatedAt: row.updated_at }));
  return (
    <div className="space-y-8">
      <SettingsClient userEmail={user.email || ""} initialDetails={initialDetails} initialRegistered={initialRegistered} />
      <NaverAccountManager />
    </div>
  );
}
