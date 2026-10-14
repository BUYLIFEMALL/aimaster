import { HistoryList } from "@/components/tests/HistoryList";
import { requireUser } from "@/lib/auth";
import { listResults } from "@/lib/results";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HistoryPage() {
  const user = await requireUser();
  const results = await listResults(user.id);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">내 결과</p>
        <h1>검사 기록</h1>
        <p>마친 검사 결과가 최근 순으로 최대 100개까지 보관됩니다. 본인만 볼 수 있습니다.</p>
      </div>
      <HistoryList initial={results} />
    </>
  );
}
