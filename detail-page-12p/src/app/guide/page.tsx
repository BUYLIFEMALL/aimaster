import { requireProgramAccess } from "@/lib/access";
import { DetailPageApp } from "@/components/DetailPageApp";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function GuideRoutePage() {
  const user = await requireProgramAccess();

  // defaultTab="guide"로 열리도록 지원
  return <DetailPageApp userEmail={user?.email} initialTab="guide" />;
}
