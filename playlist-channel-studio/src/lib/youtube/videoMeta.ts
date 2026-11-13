// v1.39 올리기 기록 저장 전 확인(플레이리스트 전용). 공용 사본 client.ts(기준 shots)는 고치지 않으려고 따로 둔다(2026-11-13 옮김).
const YOUTUBE_API = "https://www.googleapis.com/youtube/v3";

export type YoutubeVideoMeta = { channelId: string; title: string; privacy: "public" | "unlisted" | "private"; publishAt: string | null };

/** v1.39 올리기 기록 저장 전 확인 — 그 영상이 유튜브에 실제로 있는지와 채널·제목·공개 범위를 유튜브에서 읽는다(할당량 1). 없으면 null */
export async function getYoutubeVideoMeta(accessToken: string, videoId: string): Promise<YoutubeVideoMeta | null> {
  const response = await fetch(`${YOUTUBE_API}/videos?part=snippet,status&id=${encodeURIComponent(videoId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error(`영상 정보 조회에 실패했습니다. (${response.status}) ${(await response.text()).slice(0, 200)}`);
  const data = (await response.json()) as { items?: { snippet?: { channelId?: string; title?: string }; status?: { privacyStatus?: string; publishAt?: string } }[] };
  const v = data.items?.[0];
  if (!v?.snippet?.channelId) return null;
  const p = v.status?.privacyStatus;
  return {
    channelId: v.snippet.channelId,
    title: v.snippet.title ?? "",
    privacy: p === "public" || p === "unlisted" ? p : "private",
    publishAt: v.status?.publishAt ?? null,
  };
}
