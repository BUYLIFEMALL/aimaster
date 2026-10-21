import "server-only";

// v1.07 올린 영상에(플레이리스트 v1.23에서 복사) 썸네일 지정(YouTube Data API thumbnails.set). 공용 기준 youtube-upload-client에는 없는 기능이라 이 앱 전용으로 둔다.
// 유튜브 규칙: JPG/PNG 2MB 이하, 채널이 「맞춤 썸네일」 사용 인증(전화 인증)이 돼 있어야 한다. 한도 50단위/회.
export async function setYoutubeThumbnail(accessToken: string, videoId: string, jpeg: Buffer): Promise<void> {
  const url = `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${encodeURIComponent(videoId)}&uploadType=media`;
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "image/jpeg", "Content-Length": String(jpeg.length) },
    body: new Uint8Array(jpeg),
    signal: AbortSignal.timeout(60_000),
  });
  if (res.ok) return;
  const text = await res.text().catch(() => "");
  if (res.status === 403) throw new Error(`THUMB_FORBIDDEN:${text.slice(0, 200)}`);
  if (res.status === 404) throw new Error("THUMB_NOT_FOUND");
  throw new Error(`THUMB_FAILED:${res.status}:${text.slice(0, 200)}`);
}
