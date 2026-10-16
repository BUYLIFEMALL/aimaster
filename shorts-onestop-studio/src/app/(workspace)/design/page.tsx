import { StepPreparing } from "@/components/views/StepPreparing";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() {
  return <StepPreparing eyebrow="STEP 2" title="디자인·배경" intro="테마·글꼴과 장면 배경(스톡 영상·이미지, AI 이미지, 움직이는 배경)을 정합니다." items={["테마 색·카드 레이아웃·제목 글꼴과 효과", "Pexels·Pixabay 스톡 영상·이미지 검색(본인 키)", "AI 이미지 생성과 화풍·캐릭터 일관성", "전체 1장 또는 장면별 배경, 모든 장면 자동 매칭"]} />;
}
