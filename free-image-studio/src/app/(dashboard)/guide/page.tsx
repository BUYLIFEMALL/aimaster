import { requireProgramAccess } from "@/lib/access";
import { GuideScreen } from "@/components/studio/GuideScreen";

export default async function Page() {
  await requireProgramAccess();
  return <GuideScreen />;
}
