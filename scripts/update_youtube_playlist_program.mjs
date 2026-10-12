import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(envPath) {
  const text = fs.readFileSync(envPath, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv("D:/Antigravity/AIMaster/.env.local");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const updatePayload = {
  name: "Youtube Playlist 자동화",
  short_desc: "10종 오디오 스펙트럼과 14종 감성 파티클, Gemini AI 배경으로 1080p 유튜브 음악 플레이리스트 영상을 만드는 자동화 스튜디오",
  description: `유튜브 음악 채널, 로파이/시티팝 감성 플레이리스트, 인스타 릴스를 위해 비트와 주파수에 반응하는 실시간 오디오 스펙트럼과 감성 파티클 FX가 결합된 고화질 1080p MP4 비디오를 브라우저 내에서 고속 제작 자동화하는 전문 도구입니다.

주요 핵심 기능:
1. 10종 오디오 스펙트럼 비주얼라이저: 막대형, 대칭 막대, 미니막대, 원형 방사형, 선형, 3중 파형, 필드 웨이브, 라디알 링, 듀얼 스펙트럼 완비
2. 유튜브 챕터 타임라인 원클릭 복사: 여러 곡의 누적 재생시간을 자동 연산하여 유튜브 설명란에 바로 붙여넣는 타임스탬프(00:00 곡명) 클립보드 복사
3. Gemini Imagen 3 AI 배경 1클릭 생성: "비 오는 날 카페 로파이 감성", "시티팝 네온 밤거리" 등 원클릭 프리셋으로 16:9 유튜브 초고화질 배경 즉시 생성
4. 8종 컬러 필터 & 10종 트렌디 오버레이: 시네마틱/빈티지 필터, 비트 펄스, 카메라 쉐이크, 글리치, VHS, 스트로보 조명, 빛 번짐
5. 14종 스타일 파티클 오버레이: 물방울, 눈, 비, 반짝임, 하트, 불티, 빛망울, 음표 비 등 다채로운 감성 효과
6. WebCodecs GPU 가속 1080p MP4 고속 렌더링: 브라우저 GPU를 활용한 초고속 인코딩 및 디스크 직접 스트리밍 저장 지원 (반복 루프 렌더링 지원)`,
  sort_order: 124,
  badges: ["free", "new"],
  is_active: true,
  version: "v1.02",
  app_url: "https://youtube-playlist.buylife.xyz",
  updated_at: new Date().toISOString(),
};

const { data, error } = await supabase
  .from("programs")
  .update(updatePayload)
  .eq("slug", "yt-playlist-studio")
  .select();

if (error) {
  console.error("Update error:", error);
} else {
  console.log("Program updated to v1.02 successfully:", data[0]);
}
