import { requireProgramAccess } from "@/lib/access";
import { DraftForm } from "@/components/drafts/DraftForm";

export const dynamic = "force-dynamic";

export default async function NewDraftPage() {
  await requireProgramAccess();

  return (
    <div className="max-w-xl mx-auto px-4 py-10">
      <div className="text-center mb-8">
        <div className="text-5xl mb-4">✍️</div>
        <h1 className="text-3xl font-black text-gray-900 mb-2">AI 이메일 작성</h1>
        <p className="text-gray-500 text-base">주제/키워드/참고자료/추천링크를 주면 AI가 이메일 초안을 작성해드려요</p>
      </div>
      <DraftForm />
    </div>
  );
}
