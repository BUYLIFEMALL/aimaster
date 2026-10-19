"use client";

// 📤 인스타그램에 바로 올리기(v1.18) — 회원 본인 계정(INSTA 포스팅 자동화에서 한 번 연결한 값을 그대로 사용).
// 카드를 브라우저에서 JPEG로 그려 회원 폴더에 잠시 올리고, 서버가 회원 본인 토큰으로 게시한 뒤 임시 파일을 지운다.
import { useEffect, useState } from "react";
import { Camera, ExternalLink, Loader2, Send } from "lucide-react";
import { useStudio } from "./ProjectProvider";
import { BTN_PRIMARY, Card, ErrorNote, INPUT } from "./ui";
import { renderCardToJpegBlob } from "@/lib/cardnews/renderClient";
import { createClient } from "@/lib/supabase/client";

interface Status {
  connected: boolean;
  username: string;
  expired: boolean;
  connectUrl: string;
}

export function InstagramPublishPanel() {
  const { project } = useStudio();
  const { pages, style, plan, caption } = project;
  const [status, setStatus] = useState<Status | null>(null);
  const [text, setText] = useState(caption?.fullCaption ?? "");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ permalink: string; username: string } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/cardnews/instagram", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => alive && setStatus(d))
      .catch(() => alive && setStatus({ connected: false, username: "", expired: false, connectUrl: "https://auto-instagram-posting.buylife.xyz/settings" }));
    return () => {
      alive = false;
    };
  }, []);

  // 캡션을 새로 만들면 게시 문구 칸도 따라 바꾼다(직접 고친 뒤에는 그대로 둠)
  useEffect(() => {
    if (caption?.fullCaption && !text) setText(caption.fullCaption);
  }, [caption?.fullCaption]); // eslint-disable-line react-hooks/exhaustive-deps

  const ready = status?.connected && !status.expired;
  const count = pages.length;

  async function publish() {
    setError(null);
    setDone(null);
    try {
      setBusy(`카드 ${count}장을 JPEG로 만드는 중…`);
      const blobs: Blob[] = [];
      for (const p of pages) blobs.push(await renderCardToJpegBlob(p, style, plan.ratio, p.imageUrl));

      setBusy("이미지를 올리는 중…");
      const up = await fetch("/api/cardnews/instagram/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ count }) });
      const upData = await up.json().catch(() => ({}));
      if (!up.ok) throw new Error(upData.error || "이미지를 올릴 준비를 하지 못했습니다.");
      const supabase = createClient();
      const uploads = upData.uploads as { path: string; token: string }[];
      for (let i = 0; i < uploads.length; i++) {
        const { error: e } = await supabase.storage.from("cardnews-images").uploadToSignedUrl(uploads[i].path, uploads[i].token, blobs[i], { contentType: "image/jpeg" });
        if (e) throw new Error("이미지를 올리지 못했습니다. 네트워크를 확인하고 다시 시도해주세요.");
      }

      setBusy("인스타그램에 게시하는 중…(장수가 많으면 1~2분 걸릴 수 있어요)");
      const res = await fetch("/api/cardnews/instagram/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paths: uploads.map((u) => u.path), caption: text }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "인스타그램에 게시하지 못했습니다.");
      setDone({ permalink: data.permalink, username: data.username });
      setAgree(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "인스타그램에 게시하지 못했습니다.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-100"><Camera className="h-4 w-4 text-pink-400" /> 인스타그램에 바로 올리기</h2>
        {status && (
          ready ? (
            <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">연결됨 · @{status.username}</span>
          ) : (
            <a href={status.connectUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[11px] font-bold text-amber-300">
              {status.expired ? "연결 만료 — 다시 연결" : "연결 필요"} <ExternalLink className="h-3 w-3" />
            </a>
          )
        )}
      </div>
      <p className="text-[11px] text-slate-400">
        INSTA 포스팅 자동화에서 내 인스타그램 계정을 <b className="text-slate-200">한 번만 연결</b>하면 여기서도 따로 등록하지 않고 바로 씁니다. 비즈니스·크리에이터 계정만 게시할 수 있고, {count === 1 ? "1장은 피드 1장으로" : `${count}장은 캐러셀(카드뉴스)로`} 올라갑니다.
      </p>

      <label className="block">
        <span className="mb-1 flex justify-between text-xs font-bold text-slate-300">게시 문구(캡션) <span className={text.length > 2200 ? "text-red-400" : "text-slate-500"}>{text.length}/2200</span></span>
        <textarea className={`${INPUT} min-h-28`} value={text} maxLength={2200} placeholder="위에서 인스타 캡션을 생성하면 여기에 채워집니다. 직접 써도 됩니다." onChange={(e) => setText(e.target.value)} />
      </label>

      <label className="flex items-start gap-2 text-xs text-slate-300">
        <input type="checkbox" className="mt-0.5" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
        <span>내 인스타그램 계정{status?.username ? ` @${status.username}` : ""}에 이 카드뉴스가 <b>바로 공개 게시</b>되는 것을 확인했습니다.</span>
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => void publish()} disabled={!ready || !agree || !!busy || count === 0 || !text.trim()} className={BTN_PRIMARY}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} 인스타그램에 게시
        </button>
        {busy && <span className="text-xs text-slate-400">{busy}</span>}
      </div>
      {error && <ErrorNote message={error} />}
      {done && (
        <p role="status" className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          @{done.username} 계정에 게시했습니다. <a href={done.permalink} target="_blank" rel="noreferrer" className="font-bold underline">게시물 보기</a>
        </p>
      )}
    </Card>
  );
}
