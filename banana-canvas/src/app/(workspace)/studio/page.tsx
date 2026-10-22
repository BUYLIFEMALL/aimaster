import { Studio } from "@/components/studio/Studio";
import { isUuid } from "@/lib/bnc/paths";
import { cleanIdeaParam } from "@/lib/bnc/ideaParam";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ from?: string; i?: string; import?: string; idea?: string }> }) {
  const { from, i, import: importUrl, idea } = await searchParams;
  const idx = Number(i);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Nano Banana</p>
        <h1>Banana Canvas — 한 화면 이미지 작업실</h1>
        <p>원본을 올리고 원하는 카드의 버튼만 누르세요. 결과는 오른쪽에 바로 나타나고 자동으로 기록에 저장됩니다.</p>
      </div>
      <Studio fromId={isUuid(from) ? from : undefined} fromIndex={Number.isInteger(idx) && idx >= 0 ? idx : 0} importUrl={typeof importUrl === "string" ? importUrl.slice(0, 2000) : undefined} initialIdea={cleanIdeaParam(idea)} />
    </>
  );
}
