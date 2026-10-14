import { Studio } from "@/components/studio/Studio";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function StudioPage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">만화 만들기</p>
        <h1>AI 4컷 만화 자동화</h1>
        <p>주제를 입력하면 AI가 대본과 캐릭터, 컷 그림을 만들고 대사까지 얹어 4컷 만화를 완성합니다.</p>
      </div>
      <Studio />
    </>
  );
}
