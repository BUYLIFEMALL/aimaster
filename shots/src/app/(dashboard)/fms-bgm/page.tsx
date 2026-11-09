import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { FmsBgmReceiver } from "@/components/music/FmsBgmReceiver";

// v1.46 AI 무료음악 자동화 → 이미지 스토리 쇼츠 배경음악 받기(백로그 D-6). 권한은 (dashboard) 레이아웃이 확인한다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function FmsBgmPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("shorts_videos")
    .select("id, title, created_at, bgm_selected_track_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);
  const videos = (data ?? []).map((v) => ({ id: v.id, title: v.title, created_at: v.created_at, hasBgm: !!v.bgm_selected_track_id }));
  return <FmsBgmReceiver videos={videos} />;
}
