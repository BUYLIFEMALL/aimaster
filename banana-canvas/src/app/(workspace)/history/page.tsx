import { HistoryList } from "@/components/workspace/HistoryList";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function HistoryPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">결과 기록</p>
        <h1>내 결과 기록</h1>
        <p>만든 이미지를 다시 열어 다운로드하거나 이어서 편집할 수 있습니다. 업로드한 원본은 저장되지 않습니다.</p>
      </div>
      <HistoryList />
    </>
  );
}
