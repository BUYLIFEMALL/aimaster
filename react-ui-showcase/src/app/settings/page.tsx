import { requireProgramAccess } from "@/lib/access";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function SettingsPage() {
  const user = await requireProgramAccess();

  return <SettingsClient userEmail={user?.email || "buylifemall@naver.com"} />;
}
