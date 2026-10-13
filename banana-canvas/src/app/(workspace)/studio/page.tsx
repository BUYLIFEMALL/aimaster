import { Studio } from "@/components/studio/Studio";
import { isUuid } from "@/lib/bnc/paths";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function StudioPage({ searchParams }: { searchParams: Promise<{ from?: string; i?: string }> }) {
  const { from, i } = await searchParams;
  const idx = Number(i);
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">Nano Banana</p>
        <h1>이미지 만들기 · 편집 · 합성</h1>
        <p>사진 한 장으로 복원·스타일 변환·합성·배경 제거·증명사진·인생 앨범까지. 결과는 자동으로 기록에 저장됩니다.</p>
      </div>
      <Studio fromId={isUuid(from) ? from : undefined} fromIndex={Number.isInteger(idx) && idx >= 0 ? idx : 0} />
    </>
  );
}
