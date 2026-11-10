"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ImagePanel, type ImageItem } from "./ImagePanel";

export type EditablePost = {
  id: string;
  platform: "wordpress" | "blogger";
  status: string;
  title: string;
  excerpt: string;
  slug: string;
  tags: string[];
  html: string; // 서버에서 정리된 저장본
  images: ImageItem[];
};

const EDITABLE = ["ready", "draft", "failed"];

export function DraftEditor({ post }: { post: EditablePost }) {
  const router = useRouter();
  const [title, setTitle] = useState(post.title);
  const [excerpt, setExcerpt] = useState(post.excerpt);
  const [slug, setSlug] = useState(post.slug);
  const [tags, setTags] = useState(post.tags.join(", "));
  const [html, setHtml] = useState(post.html);
  const [tab, setTab] = useState<"preview" | "html">("preview");
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const editable = EDITABLE.includes(post.status);
  const dirty = title !== post.title || excerpt !== post.excerpt || slug !== post.slug || tags !== post.tags.join(", ") || html !== post.html;

  async function save() {
    setBusy("save"); setMsg(null);
    const res = await fetch(`/api/posts/${post.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title, excerpt, slug, tags: tags.split(","), html }) });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) { setMsg({ ok: false, text: data.error ?? "저장하지 못했습니다." }); return; }
    setMsg({ ok: true, text: "저장했습니다." });
    router.refresh();
  }

  async function remove() {
    if (!window.confirm("이 원고를 지울까요? 블로그에 이미 올린 글은 지워지지 않습니다.")) return;
    setBusy("delete");
    const res = await fetch(`/api/posts/${post.id}`, { method: "DELETE" });
    setBusy("");
    if (res.ok) router.push("/posts"); else setMsg({ ok: false, text: "지우지 못했습니다." });
  }

  const field = "mt-1 w-full rounded-xl border-2 border-[color:var(--border)] bg-[color:var(--surface-soft)] px-3 py-2.5 text-sm outline-none focus:border-[color:var(--wp)] disabled:opacity-60";
  const label = "block text-xs font-extrabold text-[color:var(--muted)]";
  const site = post.platform === "wordpress" ? "mysite.com" : "myblog.blogspot.com";

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
      <div className="space-y-4">
        <div className="lp-card space-y-3">
          <label className={label}>제목 <span className="font-normal">({title.length}자)</span>
            <input className={field} value={title} onChange={(e) => setTitle(e.target.value)} disabled={!editable} maxLength={120} />
          </label>
          <label className={label}>요약 설명(검색 결과에 보임) <span className="font-normal">({excerpt.length}자 · 권장 80~150자)</span>
            <textarea className={`${field} h-20`} value={excerpt} onChange={(e) => setExcerpt(e.target.value)} disabled={!editable} maxLength={300} />
          </label>
          <div className="grid gap-3 md:grid-cols-2">
            <label className={label}>주소 이름(영문){post.platform === "blogger" && <span className="font-normal"> · 구글 블로그는 제목으로 자동</span>}
              <input className={field} value={slug} onChange={(e) => setSlug(e.target.value)} disabled={!editable || post.platform === "blogger"} />
            </label>
            <label className={label}>{post.platform === "blogger" ? "라벨" : "태그"}(쉼표로 구분)
              <input className={field} value={tags} onChange={(e) => setTags(e.target.value)} disabled={!editable} />
            </label>
          </div>
        </div>

        <div className="lp-card">
          <div className="flex gap-2">
            <button type="button" onClick={() => setTab("preview")} className={`rounded-full px-3 py-1.5 text-sm font-bold ${tab === "preview" ? "bg-[color:var(--navy)] text-white" : "bg-[color:var(--surface-soft)]"}`}>미리보기(저장본)</button>
            <button type="button" onClick={() => setTab("html")} className={`rounded-full px-3 py-1.5 text-sm font-bold ${tab === "html" ? "bg-[color:var(--navy)] text-white" : "bg-[color:var(--surface-soft)]"}`}>본문 고치기(HTML)</button>
          </div>
          {tab === "preview" ? (
            <article className="wba-article mt-4" dangerouslySetInnerHTML={{ __html: post.html }} />
          ) : (
            <textarea className={`${field} mt-3 h-[520px] font-mono text-xs`} value={html} onChange={(e) => setHtml(e.target.value)} disabled={!editable} />
          )}
        </div>
      </div>

      <div className="space-y-4">
        <ImagePanel postId={post.id} images={post.images} editable={editable && !dirty} />
        {dirty && <p className="text-xs text-amber-700">글을 고친 뒤에는 먼저 저장해야 이미지를 만들 수 있습니다.</p>}
        <div className="lp-card">
          <p className={label}>구글 검색 미리보기</p>
          <div className="mt-2 rounded-2xl border-2 border-[color:var(--border)] p-3">
            <div className="text-xs text-green-700">{site} › {post.platform === "wordpress" ? slug || "주소-이름" : "2026/11/..."}</div>
            <div className="mt-0.5 text-lg leading-snug text-[#1a0dab]">{title || "제목"}</div>
            <div className="mt-1 text-sm text-slate-600">{excerpt || "요약 설명이 여기에 보입니다."}</div>
          </div>
        </div>
        <div className="lp-card space-y-2">
          <button type="button" onClick={save} disabled={!editable || !dirty || !!busy} className="lp-btn w-full disabled:opacity-50">{busy === "save" ? "저장하는 중…" : "💾 저장"}</button>
          <p className="text-xs text-[color:var(--muted)]">🚀 발행(초안·바로·예약)은 다음 단계에서 이 화면에 붙습니다.</p>
          {!editable && <p className="text-xs text-amber-700">발행 중·예약·발행된 글은 여기서 고칠 수 없습니다. 블로그 관리 화면에서 고쳐 주세요.</p>}
          <button type="button" onClick={remove} disabled={!!busy || post.status === "publishing"} className="w-full rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">원고 지우기</button>
          {msg && <p className={`rounded-xl px-3 py-2 text-sm font-semibold ${msg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>{msg.text}</p>}
        </div>
      </div>
    </div>
  );
}
