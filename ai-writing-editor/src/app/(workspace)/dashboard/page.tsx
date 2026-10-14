import { StartPanel } from "@/components/editor/StartPanel";
import { DocumentList } from "@/components/editor/DocumentList";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function DashboardPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">AI 글쓰기</p>
        <h1>새 글 만들기 · 기존 글 다듬기</h1>
        <p>주제만 적으면 AI가 초안을 쓰고, 에디터에서 문장을 드래그해 바로 고치거나 글 전체의 문법·표현 제안을 한 번에 적용할 수 있습니다. 모든 글은 자동 저장됩니다.</p>
      </div>
      <div className="stack">
        <StartPanel />
        <section className="card">
          <h2>최근 문서</h2>
          <div style={{ marginTop: 12 }}><DocumentList limit={5} /></div>
          <p style={{ marginTop: 12 }}><a href="/documents" className="subtle-link">전체 문서 보기 →</a></p>
        </section>
      </div>
    </>
  );
}
