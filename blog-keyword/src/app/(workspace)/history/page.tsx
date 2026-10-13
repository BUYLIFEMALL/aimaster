import { HistoryList } from "@/components/kw/HistoryList";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function HistoryPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">저장된 결과</p>
        <h1>분석 기록</h1>
        <p>분석한 결과는 자동으로 저장됩니다. 기록을 누르면 같은 화면에서 다시 열고, 즐겨찾기로 보관할 수 있습니다.</p>
      </div>
      <HistoryList />
    </>
  );
}
