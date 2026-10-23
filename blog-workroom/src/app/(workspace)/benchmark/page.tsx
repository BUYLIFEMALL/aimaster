import { BenchmarkView } from "@/components/views/BenchmarkView";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() { return <><div className="page-heading"><p className="eyebrow">STEP 4</p><h1>블로그 벤치마킹</h1><p>같은 주제를 쓰는 블로그를 찾아 최근 글의 주제·제목 방식을 분석하고, 참고할 검색어를 수치와 함께 고릅니다.</p></div><BenchmarkView /></>; }
