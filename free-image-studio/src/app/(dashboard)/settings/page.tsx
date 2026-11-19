import { requireProgramAccess } from "@/lib/access";
import { SettingsScreen } from "@/components/studio/SettingsScreen";

export default async function Page() {
  await requireProgramAccess();
  return <SettingsScreen />;
}
