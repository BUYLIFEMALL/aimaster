import { TargetsPanel } from "@/components/recruit/TargetsPanel";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function TargetsPage() {
  return <div className="mx-auto max-w-3xl space-y-4"><h1 className="text-2xl font-bold text-slate-900">👥 초대할 사람 모으기·승인</h1><TargetsPanel /></div>;
}
