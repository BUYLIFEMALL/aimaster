import { Analyzer } from "@/components/studio/Analyzer";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function AnalyzePage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const { h } = await searchParams;
  const historyId = typeof h === "string" && /^[0-9a-f-]{36}$/i.test(h) ? h : undefined;
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">리버스 프롬프트</p>
        <h1>파일 → 프롬프트 역설계</h1>
        <p>이미지·동영상·오디오를 올리면 AI가 분해해서 Midjourney·Sora·Suno 등에 바로 쓸 수 있는 프롬프트(JSON)로 만들어 줍니다.</p>
      </div>
      <Analyzer historyId={historyId} />
    </>
  );
}
