import { ImagesView } from "@/components/views/ImagesView";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default async function Page({ searchParams }: { searchParams: Promise<{ final?: string }> }) { const sp = await searchParams; return <><div className="page-heading"><p className="eyebrow">STEP 8</p><h1>이미지 제작</h1><p>글을 붙여 넣고 문단을 구성해 대표 1장과 본문 5~10장의 이미지를 만듭니다(본인 Gemini 키).</p></div><ImagesView finalId={sp.final ?? ""} /></>; }
