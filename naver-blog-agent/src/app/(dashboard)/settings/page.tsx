import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { SettingsClient, KeyDetail } from "./SettingsClient";
import { AccountCategoryManager } from "../accounts/page";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function maskSecret(key: string): string {
  if (!key) return "";
  if (key.length <= 8) return "••••••••";
  return `${key.slice(0, 7)}${"•".repeat(8)}${key.slice(-4)}`;
}

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const admin = createAdminClient() as any;

  const { data } = await admin
    .from("user_api_keys")
    .select("provider, api_key, updated_at")
    .eq("user_id", user.id);

  const initialRegistered: string[] = (data || []).map((row: any) => row.provider);
  const initialDetails: KeyDetail[] = (data || []).map((row: any) => ({
    provider: row.provider,
    maskedKey: maskSecret(row.api_key || ""),
    updatedAt: row.updated_at,
  }));

  return (
    <div className="space-y-8">
      <SettingsClient
        userEmail={user.email || ""}
        initialDetails={initialDetails}
        initialRegistered={initialRegistered}
      />
      <AccountCategoryManager section="accounts" />
    </div>
  );
}
