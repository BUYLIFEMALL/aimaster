import { DocumentList } from "@/components/editor/DocumentList";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function DocumentsPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">저장된 글</p>
        <h1>내 문서</h1>
        <p>최근 수정한 순서대로 최대 30개까지 보관됩니다. 오래된 문서는 새 문서를 만들 때 자동으로 정리됩니다.</p>
      </div>
      <DocumentList />
    </>
  );
}
