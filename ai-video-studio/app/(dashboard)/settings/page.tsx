import { KeySettings } from "@/components/settings/KeySettings";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function SettingsPage() {
  return <KeySettings />;
}
