import { requireProgramAccess } from "@/lib/access";
import { VideoStudio } from "@/components/video/VideoStudio";

// 2026-10-20 병합 E: Youtube Playlist 자동화에서 옮겨 온 「영상 만들기」(음악 반응 스펙트럼·파티클·AI 배경 → 브라우저 1080p MP4)
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function VideoPage() {
  const user = await requireProgramAccess();
  return <VideoStudio userId={user.id} />;
}
