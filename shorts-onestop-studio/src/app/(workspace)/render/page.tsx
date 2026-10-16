import { StepPreparing } from "@/components/views/StepPreparing";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() {
  return <StepPreparing emoji="🎙️" eyebrow="STEP 4" title="음성·자막·영상" intro="내레이션과 자막, 배경음악을 넣어 세로 쇼츠 MP4를 만듭니다." items={["본인 키 음성(TTS)과 음성 길이에 맞춘 장면 길이 자동 조절", "목소리에 맞춘 자막 번인·스타일·위치", "배경음악 볼륨 자동 조절·페이드아웃", "브라우저에서 1080×1920 MP4 만들기·내려받기, 업로드용 제목·설명·해시태그"]} />;
}
