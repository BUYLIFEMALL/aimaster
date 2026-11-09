"use client";
// v1.46 받기 전용 화면(/fms-bgm) — 무료음악 창이 연 이 창은 격리 헤더가 없어 window.opener가 살아 있다.
// 순서: 이 창 → 「sos-ready」 → 무료음악 창 → 「fms-audio」(MP3) → 회원 폴더 <user_id>/bgm/ 에 올림 → { path, name }을 sessionStorage에 두고 /render 로.
// 출처·보낸 창 확인은 가사영상 FmsImportCard.tsx와 같다.
import { useEffect, useRef, useState } from "react";
import { Music } from "lucide-react";
import { Hero } from "@/components/ui/Hero";
import { api } from "@/components/ui/api";
import { createClient } from "@/lib/supabase/client";
import { FMS_MAX_BYTES, FMS_ORIGINS, FMS_WAIT_MS, fmsFileName, fmsTrackId, saveFmsBgm } from "@/lib/fmsBgm";

type State = { kind: "wait" | "upload" | "done" | "error"; text: string };

export function FmsBgmReceiver() {
  const [state, setState] = useState<State>({ kind: "wait", text: "🎵 AI 무료음악 자동화에서 음악 파일을 받는 중…" });
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const id = fmsTrackId(window.location.hash);
    const opener = window.opener as Window | null;
    if (!id) { setState({ kind: "error", text: "받을 곡 번호가 없습니다. AI 무료음악 자동화 「모든 음악」의 「쇼츠 배경음악으로」를 다시 눌러 주세요." }); return; }
    if (!opener) { setState({ kind: "error", text: "이 창이 AI 무료음악 자동화에서 열리지 않아 음악 파일을 받을 수 없습니다. 무료음악에서 다시 보내거나, 렌더 화면의 「음악 파일 올리기」로 직접 넣어 주세요." }); return; }

    const onMessage = async (e: MessageEvent) => {
      if (!FMS_ORIGINS.includes(e.origin) || e.source !== opener) return;
      const d = e.data as { type?: string; id?: string; name?: string; blob?: Blob } | null;
      if (d?.type !== "fms-audio" || d.id !== id || !(d.blob instanceof Blob)) return;
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
      if (d.blob.size > FMS_MAX_BYTES) { setState({ kind: "error", text: "받은 음악 파일이 15MB가 넘어 배경음악으로 쓸 수 없습니다. 짧은 곡을 고르거나 파일을 잘라 직접 넣어 주세요." }); return; }
      const name = fmsFileName(d.name);
      const type = d.blob.type && d.blob.type !== "application/octet-stream" ? d.blob.type : "audio/mpeg";
      setState({ kind: "upload", text: `「${name}」을 받았습니다. 배경음악으로 올리는 중…` });
      try {
        const r = await api<{ path: string; token: string }>("/api/media/bgm", { body: { name, size: d.blob.size } });
        const { error } = await createClient().storage.from("shorts-onestop-studio").uploadToSignedUrl(r.path, r.token, new File([d.blob], name, { type }), { contentType: type });
        if (error) throw new Error("업로드에 실패했습니다. 잠시 뒤 다시 보내 주세요.");
        if (!saveFmsBgm({ path: r.path, name })) throw new Error("이 브라우저가 임시 저장을 막아 렌더 화면으로 넘기지 못했습니다. 렌더 화면에서 파일을 직접 넣어 주세요.");
        setState({ kind: "done", text: `「${name}」을 올렸습니다. 렌더 화면으로 이동합니다…` });
        // 새로 불러와야 렌더 화면이 다시 격리 헤더를 받아 무료 음성 빠른 계산이 유지된다(화면 안 이동 아님)
        window.location.assign("/render");
      } catch (err) {
        setState({ kind: "error", text: err instanceof Error ? err.message : "음악 파일을 올리지 못했습니다." });
      }
    };
    window.addEventListener("message", onMessage);
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      setState({ kind: "error", text: "음악 파일이 오지 않았습니다. 무료음악 창에서 PC 엔진이 켜져 있는지 확인하거나, 렌더 화면의 「음악 파일 올리기」로 파일을 직접 넣어 주세요." });
    }, FMS_WAIT_MS);
    for (const o of FMS_ORIGINS) opener.postMessage({ type: "sos-ready", ids: [id] }, o);
  }, []);

  return (
    <>
      <Hero eyebrow="AI 무료음악 자동화 → 쇼츠" title="🎵 무료음악 곡을 배경음악으로 받는 중" desc="AI 무료음악 자동화에서 보낸 곡을 받아 렌더 화면의 배경음악으로 넣습니다. 받는 동안 이 창을 닫지 마세요." emoji="🎵" meta={["🔒 내 계정 폴더에만 저장", "💸 추가 요금 없음"]} />
      <section className="card stack">
        <p className={state.kind === "error" ? "" : "muted"} role={state.kind === "error" ? "alert" : "status"}>{state.text}</p>
        {state.kind === "error" && <a className="button primary" href="/render"><Music size={14} />렌더 화면으로 가기</a>}
      </section>
    </>
  );
}
