import { requireProgramAccess } from "@/lib/access";
import GuideClient from "./GuideClient";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function GuidePage() {
  const user = await requireProgramAccess();

  return <GuideClient userEmail={user?.email || "buylifemall@naver.com"} />;
}
