import { TrendsView } from "@/components/views/TrendsView";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() { return <><div className="page-heading"><p className="eyebrow">STEP 3</p><h1>트렌드 관측</h1><p>내 주제의 최신 뉴스·웹 자료에서 새 용어를 찾고, 그 용어의 검색 급상승과 경쟁 정도를 검증합니다.</p></div><TrendsView /></>; }
