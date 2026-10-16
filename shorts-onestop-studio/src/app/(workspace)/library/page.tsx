import { StepPreparing } from "@/components/views/StepPreparing";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() {
  return <StepPreparing eyebrow="보관함" title="내 보관함" intro="만든 프로젝트와 자주 쓰는 설정, 카테고리별 지침을 모아 둡니다." items={["이름 붙인 프로젝트 저장·불러오기", "자주 쓰는 조합을 내 프리셋으로 저장", "카테고리별 내 대본 작성 지침"]} />;
}
