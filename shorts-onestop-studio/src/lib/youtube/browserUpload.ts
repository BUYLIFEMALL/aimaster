// v1.21 브라우저 → 유튜브 업로드(렌더 화면 ⑥·발행 계획 일괄 제작 공용). 서버는 업로드 주소만 만들고(/api/youtube/upload-session),
// 영상은 이 브라우저가 유튜브로 바로 보낸다. 유튜브 API 한도: 회원 Google 앱 하루 10,000단위, 업로드 1회 1,600단위 → 하루 약 6편.
import { api } from "@/components/ui/api";
import type { ShortsScript, YoutubeUpload } from "@/lib/script";

export const DAILY_UPLOAD_LIMIT = 6;
const MIN_LEAD_MS = 15 * 60_000;

/** 업로드 문구(SEO)가 있으면 그것, 없으면 대본 제목 + #Shorts */
export function uploadDefaults(s: ShortsScript) {
  const tags = [...new Set([...(s.seo?.hashtags ?? []), "#Shorts"])];
  return {
    title: (s.seo?.titles?.[0] ?? s.intro.title).slice(0, 100),
    description: [s.seo?.description ?? "", tags.join(" ")].filter(Boolean).join("\n\n").slice(0, 5000),
    tags: (s.seo?.tags ?? []).join(", "),
  };
}

/** 발행 계획 일정(한국 시간 날짜·"HH:MM") → ISO. 15분 안이거나 지났으면 null(예약 불가) */
export function planSlotIso(date: string, time: string, now = Date.now()): string | null {
  const ms = new Date(`${date}T${time}:00+09:00`).getTime();
  return Number.isFinite(ms) && ms >= now + MIN_LEAD_MS ? new Date(ms).toISOString() : null;
}

/** ISO → datetime-local 입력값(이 브라우저 시간대) */
export function toLocalInput(iso: string): string {
  const d = new Date(iso); const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export const isQuotaMessage = (m: string) => /한도|할당량|quota/i.test(m);

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
  blob: Blob; title: string; description: string; tags: string; privacy: YoutubeUpload["privacy"]; categoryId: string;
  publishAt: string | null; channel: string | null; onPct: (n: number) => void;
}): Promise<YoutubeUpload> {
  const tags = o.tags.split(/\s*,\s*/).filter(Boolean);
  const { uploadUrl } = await api<{ uploadUrl: string }>("/api/youtube/upload-session", {
    body: { title: o.title, description: o.description, tags, privacy: o.privacy, categoryId: o.categoryId, publishAt: o.publishAt, size: o.blob.size },
  });
  const videoId = await putVideo(uploadUrl, o.blob, o.onPct);
  return { videoId, url: `https://youtube.com/shorts/${videoId}`, title: o.title, privacy: o.publishAt ? "private" : o.privacy, publishAt: o.publishAt, channel: o.channel, uploadedAt: new Date().toISOString() };
}
