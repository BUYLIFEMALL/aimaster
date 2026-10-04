import { HomePanel } from "@/components/studio/HomePanel";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DashboardPage() {
  return <HomePanel />;
}
