"use client";

import React, { useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import NaverPublishSettings from "@/components/NaverPublishSettings";
import PostReviewGate from "@/components/PostReviewGate";
import { postReviewSnapshot } from "@/lib/postReviewSnapshot";
import { bodyImageAt, generatedDraftImages, type DraftImage } from "@/lib/draftImages";
import type { PostSaveClient } from "@/lib/postSaveClient";

export interface QuickPost { id: string; blog_id: string; category_name: string; title: string; content: string; tags: string[]; images: DraftImage[]; save_revision?: string }

// E-4 간편 결과 화면: 미리보기 → 발행 설정 → 최종 확인 → 확장 작업 대기 전송. 세부 편집은 전체 기능(콘텐츠 생성 화면).
export default function QuickResult({ post, saver, onChange }: { post: QuickPost; saver: PostSaveClient; onChange: (post: QuickPost) => void }) {
  const [publishingBlocked, setPublishingBlocked] = useState(true);
  const [reviewBlocked, setReviewBlocked] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const shown = generatedDraftImages(post.images);
  const thumb = shown.find((image) => image.type === "thumbnail");
  // 작성 화면 미리보기와 같은 표시 기호 두 가지: [SECTION - 소제목], [IMAGE INSERT - 설명](본문 이미지 자리)
  let slot = 0;
  const blocks: React.ReactNode[] = [];
  post.content.split(/\n{2,}/).forEach((chunk, i) => {
    const lines = chunk.split("\n");
    let text: string[] = [];
    const flush = (k: string) => { if (text.join("").trim()) blocks.push(<p key={k} className="whitespace-pre-wrap">{text.join("\n").trim()}</p>); text = []; };
    lines.forEach((line, j) => {
      const t = line.trim();
      if (/^\[SECTION/.test(t) && t.endsWith("]")) { flush(`${i}-${j}t`); blocks.push(<h3 key={`${i}-${j}`} className="pt-2 text-base font-bold text-neutral-900">{t.replace(/^\[SECTION\s*-\s*/, "").replace(/\]$/, "")}</h3>); return; }
      if (/^\[IMAGE INSERT/.test(t) && t.endsWith("]")) {
        flush(`${i}-${j}t`);
        const image = bodyImageAt(shown, slot++);
        if (image) blocks.push(<img key={`${i}-${j}`} src={image.url} alt={image.caption} className="w-full rounded-xl border border-neutral-200 object-contain" />);
        return;
      }
      text.push(line);
    });
    flush(`${i}-end`);
  });

  const queue = async () => {
    if (busy || reviewBlocked || publishingBlocked) return;
    setBusy(true); setNotice(null);
    try {
      const saved = await saver.save({ blog_id: post.blog_id, category_name: post.category_name, title: post.title, content: post.content, tags: post.tags, images: post.images, status: "queued" });
      onChange({ ...post, save_revision: saved.save_revision });
      setNotice({ ok: true, text: "크롬 확장의 작업 대기에 등록했습니다. 크롬이 열려 있으면 확장이 스마트에디터에 입력을 시작합니다(발행 설정의 진행 방식대로)." });
    } catch (error) {
      setNotice({ ok: false, text: error instanceof Error ? error.message : "작업 대기 등록에 실패했습니다." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="quick-result" className="space-y-4">
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-2xs">
        <p className="text-[11px] font-bold text-emerald-700">⑤ 완성 원고 미리보기 · 보관함에 저장됨</p>
        <h2 className="mt-1 text-xl font-bold text-neutral-900">{post.title}</h2>
        {thumb && <img src={thumb.url} alt={thumb.caption} className="mt-3 w-full rounded-xl border border-neutral-200 object-contain" />}
        <div className="mt-4 space-y-3 text-sm leading-7 text-neutral-800">{blocks}</div>
        {post.tags.length > 0 && <p className="mt-3 text-xs text-emerald-700">{post.tags.map((tag) => `#${tag}`).join(" ")}</p>}
        <p className="mt-3 text-[11px] text-neutral-500">문장·이미지를 하나씩 고치려면 에이전트 전체 기능(콘텐츠 생성 화면)을 이용하세요.</p>
      </div>

      <NaverPublishSettings postId={post.id} saveRevision={post.save_revision} onBlockingChange={setPublishingBlocked} onSaved={(tags, saved, expected) => {
        saver.adopt(saved, expected);
        onChange({ ...post, tags, save_revision: saved.save_revision });
      }} />
      <PostReviewGate key={post.id} postId={post.id} snapshot={postReviewSnapshot(post)} onBlockingChange={setReviewBlocked} />

      <div className="flex flex-col gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 sm:flex-row sm:items-center">
        <p className="text-xs text-neutral-600">발행 설정을 저장하고 최종 원고를 직접 확인하면 네이버 입력을 시작할 수 있습니다.</p>
        <button type="button" onClick={queue} disabled={busy || reviewBlocked || publishingBlocked}
          className="sm:ml-auto inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} ⑥ 네이버 확장 작업 대기에 전송
        </button>
      </div>
      {notice && <p className={`flex items-start gap-1.5 text-xs ${notice.ok ? "text-emerald-700" : "text-rose-600"}`}>{notice.ok && <CheckCircle2 size={14} className="mt-0.5 shrink-0" />}{notice.text}</p>}
    </section>
  );
}
