import { HistoryList } from "@/components/studio/HistoryList";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function HistoryPage() {
  const user = await requireUser();
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">내 기록</p>
        <h1>만든 사진 기록</h1>
        <p>최근 20장이 이 브라우저에만 보관됩니다(서버에는 저장되지 않아요). 브라우저 데이터를 지우거나 다른 기기에서는 보이지 않습니다.</p>
      </div>
      <HistoryList userId={user.id} />
    </>
  );
}
