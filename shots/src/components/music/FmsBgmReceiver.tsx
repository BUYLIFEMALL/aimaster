"use client";

// v1.46 받기 화면(/fms-bgm) — AI 무료음악 자동화가 연 이 창에서 곡을 받아, 회원이 고른 영상의 배경음악으로 넣는다(백로그 D-6).
// 순서: 「shs-ready」 → 「fms-audio」(곡) → 영상 고르기 → 일회용 주소로 회원 폴더에 올림 → 곡 저장·선택 → 그 영상 화면으로.
// 출처·보낸 창 확인은 쇼츠 원스톱 FmsBgmReceiver.tsx와 같다. 설명: src/lib/fmsBgm.ts
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { finishFmsBgmUploadAction, startFmsBgmUploadAction } from "@/lib/actions/fmsBgm";
import { FMS_MAX_BYTES, FMS_ORIGINS, FMS_READY_TYPE, FMS_WAIT_MS, fmsContentType, fmsFileName, fmsTitle, fmsTrackId } from "@/lib/fmsBgm";

type VideoItem = { id: string; title: string; created_at: string; hasBgm: boolean };
type State = { kind: "wait" | "pick" | "upload" | "done" | "error"; text: string };

/** 곡 길이(초) — 못 읽으면 null(카드에 길이를 숨김) */
function readSeconds(blob: Blob): Promise<number | null> {
  return new Promise((ok) => {
    const url = URL.createObjectURL(blob);
    const a = new Audio();
    const end = (v: number | null) => { URL.revokeObjectURL(url); ok(v); };
    a.preload = "metadata";
    a.onloadedmetadata = () => end(Number.isFinite(a.duration) ? a.duration : null);
    a.onerror = () => end(null);
    a.src = url;
  });
}

/** 무료음악 창의 곡을 기다린다(화면 밖 함수 — 상태 바꾸기는 인자로 받음) */
function listen(videoCount: number, setState: (v: State) => void, setSong: (v: { blob: Blob; name: string }) => void) {
  const id = fmsTrackId(window.location.hash) ?? fmsTrackId(window.location.search);
  const opener = window.opener as Window | null;
  if (!id) { setState({ kind: "error", text: "받을 곡 번호가 없습니다. AI 무료음악 자동화 「모든 음악」에서 다시 보내 주세요." }); return; }
  if (!opener) { setState({ kind: "error", text: "이 창이 AI 무료음악 자동화에서 열리지 않아 음악 파일을 받을 수 없습니다. 무료음악에서 다시 보내 주세요." }); return; }

  const onMessage = (e: MessageEvent) => {
    if (!FMS_ORIGINS.includes(e.origin) || e.source !== opener) return;
    const d = e.data as { type?: string; id?: string; name?: string; blob?: Blob } | null;
    if (d?.type !== "fms-audio" || d.id !== id || !(d.blob instanceof Blob)) return;
    window.removeEventListener("message", onMessage);
    window.clearTimeout(timer);
    if (d.blob.size > FMS_MAX_BYTES) { setState({ kind: "error", text: "받은 음악 파일이 15MB가 넘어 배경음악으로 쓸 수 없습니다. 짧은 곡을 골라 다시 보내 주세요." }); return; }
    const name = fmsFileName(d.name);
    setSong({ blob: d.blob, name });
    setState(videoCount
      ? { kind: "pick", text: `「${fmsTitle(name)}」을 받았습니다. 아래에서 이 곡을 넣을 영상을 골라 주세요.` }
      : { kind: "error", text: "곡을 받았지만 넣을 영상이 없습니다. 먼저 「주제 수집 → 영상스크립트」로 영상을 만든 뒤 무료음악에서 다시 보내 주세요." });
  };
  window.addEventListener("message", onMessage);
  const timer = window.setTimeout(() => {
    window.removeEventListener("message", onMessage);
    setState({ kind: "error", text: "음악 파일이 오지 않았습니다. 무료음악 창에서 PC 엔진이 켜져 있는지 확인한 뒤 다시 보내 주세요." });
  }, FMS_WAIT_MS);
  for (const o of FMS_ORIGINS) opener.postMessage({ type: FMS_READY_TYPE, ids: [id] }, o);
}

export function FmsBgmReceiver({ videos }: { videos: VideoItem[] }) {
  const router = useRouter();
  const [state, setState] = useState<State>({ kind: "wait", text: "🎵 AI 무료음악 자동화에서 음악 파일을 받는 중…" });
  const [song, setSong] = useState<{ blob: Blob; name: string } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    // 화면이 그려진 직후에 시작(효과 안에서 바로 상태를 바꾸지 않음)
    queueMicrotask(() => listen(videos.length, setState, setSong));
  }, [videos.length]);

  async function putInto(videoId: string) {
    if (!song) return;
    setState({ kind: "upload", text: `「${fmsTitle(song.name)}」을 배경음악으로 올리는 중…` });
    try {
      const s = await startFmsBgmUploadAction({ videoId, name: song.name, size: song.blob.size });
      if (s.error || !s.path || !s.token) throw new Error(s.error ?? "업로드를 시작하지 못했습니다.");
      const type = fmsContentType(song.name);
      const { error } = await createClient().storage.from("shots-bgm").uploadToSignedUrl(s.path, s.token, new File([song.blob], song.name, { type }), { contentType: type });
      if (error) throw new Error("음악 파일을 올리지 못했습니다. 잠시 뒤 다시 시도해 주세요.");
      const f = await finishFmsBgmUploadAction({ videoId, path: s.path, name: song.name, seconds: await readSeconds(song.blob) });
      if (f.error) throw new Error(f.error);
      setState({ kind: "done", text: "배경음악으로 넣고 이 곡을 골라 두었습니다. 영상 화면으로 이동합니다…" });
      router.push(`/scripts/${videoId}`);
    } catch (err) {
      // 곡은 화면에 그대로 있으므로 다른 영상을 고르거나 다시 누를 수 있다
      setState({ kind: "pick", text: err instanceof Error ? err.message : "배경음악으로 넣지 못했습니다." });
    }
  }

  const busy = state.kind === "upload" || state.kind === "done";
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-2 text-2xl font-semibold text-[#f1f1f1]">🎵 무료음악 곡을 배경음악으로</h1>
      <p className="mb-6 text-sm text-[#aaaaaa]">AI 무료음악 자동화에서 보낸 곡을 받아, 고른 영상의 배경음악으로 넣습니다. 내 계정 폴더에만 저장되고 추가 요금은 없습니다. 받는 동안 이 창을 닫지 마세요.</p>
      <section className="rounded-lg border border-[#2a2f45] bg-[#13182c] p-4">
        <p role={state.kind === "error" ? "alert" : "status"} className={`text-sm ${state.kind === "error" ? "text-red-300" : "text-[#f1f1f1]"}`}>{state.text}</p>
        {song && state.kind !== "error" && (
          <ul className="mt-4 space-y-2">
            {videos.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 rounded-md border border-[#2a2f45] bg-[#0b0d1b] px-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[#f1f1f1]">{v.title || "제목 없음"}</p>
                  <p className="text-xs text-[#aaaaaa]">{new Date(v.created_at).toLocaleDateString("ko-KR")}{v.hasBgm ? " · 배경음악 있음(이 곡으로 바뀜)" : ""}</p>
                </div>
                <button type="button" disabled={busy} onClick={() => void putInto(v.id)} className="shrink-0 rounded-lg bg-[#f43f5e] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#e11d48] disabled:opacity-50">이 영상에 넣기</button>
              </li>
            ))}
          </ul>
        )}
        {state.kind === "error" && <a href="/music" className="mt-3 inline-block text-sm font-bold text-[#fbbf24] underline">음악 생성 화면으로 가기</a>}
      </section>
    </div>
  );
}
