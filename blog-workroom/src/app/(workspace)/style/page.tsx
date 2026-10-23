import { StyleView } from "@/components/views/StyleView";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() { return <><div className="page-heading"><p className="eyebrow">STEP 1</p><h1>내 블로그 스타일 진단</h1><p>내 글의 문체·주제·독자 패턴을 분석합니다. 결과를 확인하고 승인하면 이후 키워드·초안이 내 스타일에 맞춰집니다.</p></div><StyleView /></>; }
