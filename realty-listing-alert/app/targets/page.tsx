import ComingSoonPage from "@/components/ComingSoonPage";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function Page() {
  return <ComingSoonPage active="targets" icon="🎯" title="감시 대상" desc="관심 단지를 최대 10개까지 정하고, 거래 종류·가격·면적 조건을 겁니다." />;
}
