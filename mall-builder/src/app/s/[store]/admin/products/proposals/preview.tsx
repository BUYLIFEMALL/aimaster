"use client";
// 사진 제안 미리보기 — 누를 때만 회원 세션으로 짧은 서명 주소(60초)를 받아 이미지로만 보여 준다.
// 주소 글자는 화면·콘솔·기록에 남기지 않는다(Master msg_c506ba34f9a0). 읽기 권한은 0106 저장소 정책이 판정.
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PROPOSAL_BUCKET } from "@/lib/mallPhotoSave";

export function ProposalPreview({ path }: { path: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  async function show() {
    setMsg("");
    const { data, error } = await createClient().storage.from(PROPOSAL_BUCKET).createSignedUrl(path, 60);
    if (error || !data?.signedUrl) { setMsg("미리보기를 불러오지 못했습니다."); return; }
    setSrc(data.signedUrl);
  }
  return (
    <span className="flex items-center gap-2">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="제안 사진 미리보기" className="h-20 w-20 rounded border object-cover" referrerPolicy="no-referrer" onError={() => { setSrc(null); setMsg("미리보기가 만료되었습니다. 다시 눌러 주세요."); }} />
      ) : (
        <button type="button" onClick={show} className="rounded border px-2 py-1 text-xs" data-proposal-preview>미리보기</button>
      )}
      {msg && <span className="text-xs text-amber-700">{msg}</span>}
    </span>
  );
}
