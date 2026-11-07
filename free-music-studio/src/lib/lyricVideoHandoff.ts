// 만든 곡 → 가사 영상(백로그 D-1, 2026-11-07 주인님 「추천대로 진행해」).
// 가사 영상 창(/source?fms=<곡 번호>)을 열면 그 창이 제목·가사·가사 시간을 공용 DB에서 읽고(회원 본인 곡만),
// 음원은 회원 PC 엔진에만 있으므로 이 창이 엔진에서 받아 브라우저 안에서 그 창으로 건넨다(postMessage — 서버로 올리지 않음).
// 순서: 가사 영상 창 → 「lvs-ready」 → 이 창 → 「fms-audio」({ id, name, blob }).
import { fetchLibraryFile } from "@/lib/engine";

export const LYRIC_VIDEO_URL = "https://lyric-video-studio.buylife.xyz";
const WAIT_MS = 120_000;
const safeName = (s: string) => s.replace(/[\\/:*?"<>|]/g, "_").trim().slice(0, 60) || "free-music";

/** 클릭 안에서 바로 불러야 한다(새 창 막힘 방지). 음원을 못 받으면 onError — 가사 영상 창은 직접 넣기 안내를 띄운다. */
export function openLyricVideo(track: { id: string; title: string }, onError: (text: string) => void): boolean {
  const win = window.open(`${LYRIC_VIDEO_URL}/source?fms=${track.id}`, "_blank");
  if (!win) {
    onError("새 창이 막혔습니다. 브라우저 주소창 오른쪽의 팝업 허용을 누른 뒤 다시 눌러 주세요.");
    return false;
  }
  let file: { blob: Blob; name: string } | null = null;
  let ready = false;
  const send = () => {
    if (!file || !ready || win.closed) return;
    win.postMessage({ type: "fms-audio", id: track.id, name: file.name, blob: file.blob }, LYRIC_VIDEO_URL);
    stop();
  };
  const onMessage = (e: MessageEvent) => {
    if (e.origin !== LYRIC_VIDEO_URL || e.source !== win) return;
    const d = e.data as { type?: string; id?: string } | null;
    if (d?.type === "lvs-ready" && d.id === track.id) {
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
  fetchLibraryFile(track.id)
    .then(async ({ url, ext }) => {
      const blob = await fetch(url).then((r) => r.blob());
      URL.revokeObjectURL(url);
      file = { blob, name: `${safeName(track.title)}.${ext}` };
      send();
    })
    .catch(() => {
      stop();
      onError("내 PC 엔진에서 음악 파일을 받지 못했습니다. 가사 영상 화면에서 노래 저장 폴더의 파일을 직접 넣어 주세요.");
    });
  return true;
}
