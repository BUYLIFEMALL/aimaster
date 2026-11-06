import { MembersPanel, ResultsPanel } from "@/components/recruit/ResultsPanel";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function ResultsPage() {
  return <div className="mx-auto max-w-3xl space-y-4"><h1 className="text-2xl font-bold text-slate-900">📊 보낸 결과 · 엑셀</h1><ResultsPanel /><MembersPanel /></div>;
}
