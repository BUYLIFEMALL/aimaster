// 만든 곡 → 플레이리스트 영상·뮤직비디오(백로그 D-1 나머지, 2026-11-08 주인님 「D-1 나머지 진행해」).
// 가사 영상(lyricVideoHandoff.ts)과 같은 방식: 받는 창이 제목·가사·가사 시간을 공용 DB에서 읽고(회원 본인 곡만),
// 음원은 회원 PC 엔진에만 있으므로 이 창이 엔진에서 받아 브라우저 안에서 그 창으로 건넨다(postMessage — 서버로 올리지 않음).
// 순서: 받는 창 → 「<준비 신호>」({ ids }) → 이 창 → 곡마다 「fms-audio」({ id, name, blob }).
import { fetchLibraryFile } from "@/lib/engine";

export const PLAYLIST_VIDEO_URL = "https://playlist-channel-studio.buylife.xyz";
export const MUSIC_VIDEO_URL = "https://music-video-studio.buylife.xyz";
/** 쇼츠 원스톱 배경음악(백로그 D-4, 받는 쪽 v1.46 — 영상 담당, docs/HANDOFF_20261109_SHORTS_BGM_FROM_FMS.md 9절) */
export const SHORTS_URL = "https://shorts-onestop-studio.buylife.xyz";
/** 플레이리스트 영상에 한 번에 보낼 수 있는 곡 수(받는 쪽 주소·서버 조회 상한과 같음) */
export const PLAYLIST_MAX = 20;
const WAIT_MS = 180_000;
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_").trim().slice(0, 60) || "free-music";

/** hash: 곡 번호를 #fms=로(쇼츠는 주소를 바꿔 쓰므로 해시로 받음) · mp3: 원음 대신 MP3 320k로(받는 쪽 업로드 상한 15MB) */
type Target = { origin: string; path: string; readyType: string; hash?: boolean; mp3?: boolean };
const TARGETS = {
  playlist: { origin: PLAYLIST_VIDEO_URL, path: "/video", readyType: "pcs-ready" },
  musicVideo: { origin: MUSIC_VIDEO_URL, path: "/music", readyType: "mvs-ready" },
  shorts: { origin: SHORTS_URL, path: "/render", readyType: "sos-ready", hash: true, mp3: true },
} satisfies Record<string, Target>;

/**
 * 클릭 안에서 바로 불러야 한다(새 창 막힘 방지). 곡마다 엔진에서 음원을 받아 받는 창이 준비되면 건넨다.
 * 음원을 하나라도 못 받으면 onError — 받는 창은 그 곡을 「파일 직접 넣기」로 안내한다.
 */
export function openVideoWithSongs(
  kind: keyof typeof TARGETS,
  tracks: { id: string; title: string }[],
  onError: (text: string) => void,
): boolean {
  const t: Target = TARGETS[kind];
  const list = tracks.slice(0, kind === "playlist" ? PLAYLIST_MAX : 1);
  if (!list.length) return false;
  const win = window.open(`${t.origin}${t.path}${t.hash ? "#" : "?"}fms=${list.map((x) => x.id).join(",")}`, "_blank");
  if (!win) {
    onError("새 창이 막혔습니다. 브라우저 주소창 오른쪽의 팝업 허용을 누른 뒤 다시 눌러 주세요.");
    return false;
  }
  const files = new Map<string, { blob: Blob; name: string }>();
  const sent = new Set<string>();
  let ready = false;
  let pending = list.length;
  const send = () => {
    if (!ready || win.closed) return;
    for (const [id, f] of files) {
      if (sent.has(id)) continue;
      win.postMessage({ type: "fms-audio", id, name: f.name, blob: f.blob }, t.origin);
      sent.add(id);
    }
    if (pending === 0) stop();
  };
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== t.origin || e.source !== win) return;
    const d = e.data as { type?: string } | null;
    if (d?.type === t.readyType) {
      ready = true;
      send();
    }
  };
  const timer = window.setTimeout(() => stop(), WAIT_MS);
  function stop() {
    window.removeEventListener("message", onMessage);
    window.clearTimeout(timer);
  }
  window.addEventListener("message", onMessage);
  const failed: string[] = [];
  // 엔진에 한꺼번에 몰리지 않게 한 곡씩 차례로 받는다
  void (async () => {
    for (const tr of list) {
      try {
        const { url, ext } = await fetchLibraryFile(tr.id, t.mp3 ? "mp3" : undefined);
        const blob = await fetch(url).then((r) => r.blob());
        URL.revokeObjectURL(url);
        files.set(tr.id, { blob, name: `${safeName(tr.title)}.${ext}` });
      } catch {
        failed.push(tr.title);
      }
      pending--;
      send();
    }
    if (failed.length)
      onError(`내 PC 엔진에서 음악 파일을 받지 못한 곡이 있습니다: ${failed.map((x) => `「${x}」`).join(", ")}. 그 곡은 열린 화면에서 노래 저장 폴더의 파일을 직접 넣어 주세요.`);
  })();
  return true;
}
