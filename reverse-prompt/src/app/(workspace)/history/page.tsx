import { HistoryList } from "@/components/workspace/HistoryList";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function HistoryPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">분석 기록</p>
        <h1>내 분석 기록</h1>
        <p>이전 분석 결과를 다시 열어 프롬프트를 복사하거나 고칠 수 있습니다. 원본 파일은 저장되지 않습니다.</p>
      </div>
      <HistoryList />
    </>
  );
}
