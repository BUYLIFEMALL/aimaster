import { WorkspacePage } from "@/components/workspace/WorkspacePage";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() { return <WorkspacePage section="library"/>; }
