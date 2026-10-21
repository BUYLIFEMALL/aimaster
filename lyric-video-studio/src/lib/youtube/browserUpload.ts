// v1.04 브라우저 → 유튜브 업로드(shorts-onestop-studio browserUpload.ts를 가사영상에 맞게 줄임).
// 서버는 업로드 주소만 만들고(/api/youtube/upload-session), 영상은 이 브라우저가 유튜브로 바로 보낸다(서버 요금·4.5MB 한도 없음).
// 유튜브 API 한도: 회원 Google 앱 하루 10,000단위, 업로드 1회 1,600단위 → 하루 약 6편.
import { api } from "@/components/ui/api";
import { timeline, type LyricLine } from "@/lib/lyrics";

export type Privacy = "private" | "unlisted" | "public";
export interface UploadRecord { videoId: string; url: string; title: string; privacy: Privacy; publishAt: string | null; uploadedAt: string }

/** 기본 제목·설명·태그 — 제목은 「아티스트 - 곡 (Lyrics)」, 설명은 가사 전문, 세로 영상은 #Shorts */
export function uploadDefaults(o: { title: string; artist: string; lines: LyricLine[]; portrait: boolean }) {
  const name = [o.artist.trim(), o.title.trim() || "제목 없음"].filter(Boolean).join(" - ");
  const tags = ["#가사", "#lyrics", ...(o.portrait ? ["#Shorts"] : [])];
  const lyrics = timeline(o.lines).map((l) => l.text.replace(/\n/g, " ")).join("\n");
  return {
    title: `${name} (Lyrics)${o.portrait ? " #Shorts" : ""}`.slice(0, 100),
    description: [`${name}`, lyrics, tags.join(" ")].filter(Boolean).join("\n\n").slice(0, 5000),
    tags: [o.artist, o.title, "가사", "lyrics", "가사영상"].map((t) => t.trim()).filter(Boolean).join(", "),
  };
}

/** 업로드 주소로 영상을 보낸다(진행률). 유튜브 응답의 영상 ID를 돌려준다 */
function putVideo(url: string, blob: Blob, onPct: (n: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("Content-Type", "video/mp4");
    x.upload.onprogress = (e) => { if (e.lengthComputable) onPct(Math.round((e.loaded / e.total) * 100)); };
    x.onload = () => {
      let id = "";
      try { id = JSON.parse(x.responseText)?.id ?? ""; } catch { /* 아래에서 처리 */ }
      if (x.status >= 200 && x.status < 300 && id) resolve(id);
      else reject(new Error(x.status === 403 ? "유튜브가 업로드를 거절했습니다(권한 또는 채널 업로드 제한). 채널 상태를 확인해 주세요." : `유튜브에 영상을 보내지 못했습니다(${x.status}). 다시 시도해 주세요.`));
    };
    x.onerror = () => reject(new Error("유튜브로 영상을 보내는 중 연결이 끊겼습니다. 네트워크를 확인하고 다시 시도해 주세요."));
    x.send(blob);
  });
}

export async function uploadToYoutube(o: {
  blob: Blob; title: string; description: string; tags: string; privacy: Privacy; categoryId: string;
  publishAt: string | null; portrait: boolean; onPct: (n: number) => void; accountId?: string | null;
}): Promise<UploadRecord> {
  const tags = o.tags.split(/\s*,\s*/).filter(Boolean);
  const { uploadUrl } = await api<{ uploadUrl: string }>("/api/youtube/upload-session", {
    body: { title: o.title, description: o.description, tags, privacy: o.privacy, categoryId: o.categoryId, publishAt: o.publishAt, size: o.blob.size, accountId: o.accountId ?? null },
  });
  const videoId = await putVideo(uploadUrl, o.blob, o.onPct);
  return { videoId, url: o.portrait ? `https://youtube.com/shorts/${videoId}` : `https://youtu.be/${videoId}`, title: o.title, privacy: o.publishAt ? "private" : o.privacy, publishAt: o.publishAt, uploadedAt: new Date().toISOString() };
}
