"use client";

import { useState } from "react";
import GlassCard from "@/components/ui/GlassCard";
import GoldButton from "@/components/ui/GoldButton";
import { formatDate } from "@/lib/utils/format";

interface LegalDoc {
  slug: string;
  title: string;
  content: string;
  updated_at: string;
}

interface LegalDocManagerProps {
  initialDocs: LegalDoc[];
}

const SLUG_ORDER = ["terms", "privacy", "refund"];

export default function LegalDocManager({ initialDocs }: LegalDocManagerProps) {
  const [docs, setDocs] = useState<LegalDoc[]>(initialDocs);
  const [activeSlug, setActiveSlug] = useState(initialDocs[0]?.slug ?? "terms");
  const [content, setContent] = useState(() => docs.find((d) => d.slug === activeSlug)?.content ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const activeDoc = docs.find((d) => d.slug === activeSlug);
  const isDirty = activeDoc ? content !== activeDoc.content : false;

  function switchTab(slug: string) {
    if (isDirty && !confirm("저장하지 않은 변경사항이 있습니다. 다른 문서로 이동하면 사라집니다. 계속할까요?")) {
      return;
    }
    setActiveSlug(slug);
    setContent(docs.find((d) => d.slug === slug)?.content ?? "");
    setError("");
    setSaved(false);
  }

  async function handleSave() {
    if (!activeDoc) return;
    if (!content.trim()) {
      setError("내용을 입력해주세요.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/legal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeDoc.slug, title: activeDoc.title, content: content.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDocs((prev) => prev.map((d) => (d.slug === data.slug ? data : d)));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 실패");
    } finally {
      setSaving(false);
    }
  }

  const orderedDocs = [...docs].sort((a, b) => SLUG_ORDER.indexOf(a.slug) - SLUG_ORDER.indexOf(b.slug));

  if (docs.length === 0) {
    return (
      <GlassCard className="text-center py-16">
        <p className="text-subtext">문서를 불러오지 못했습니다. supabase/add-legal-documents.sql 마이그레이션이 적용됐는지 확인해주세요.</p>
      </GlassCard>
    );
  }

  return (
    <div>
      <div className="flex gap-2 mb-6 border-b border-white/10">
        {orderedDocs.map((doc) => (
          <button
            key={doc.slug}
            onClick={() => switchTab(doc.slug)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeSlug === doc.slug
                ? "text-gold border-gold"
                : "text-subtext border-transparent hover:text-white"
            }`}
          >
            {doc.title}
          </button>
        ))}
      </div>

      {activeDoc && (
        <GlassCard>
          <div className="flex items-center justify-between mb-4">
            <p className="text-white font-bold">{activeDoc.title}</p>
            <p className="text-subtext text-xs">최종 수정일: {formatDate(activeDoc.updated_at)}</p>
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="input-dark w-full h-[28rem] resize-y font-mono text-xs leading-relaxed"
            placeholder="문서 내용을 입력하세요 (줄바꿈 그대로 화면에 반영됩니다)"
          />

          {error && (
            <p className="mt-3 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">{error}</p>
          )}

          <div className="flex items-center gap-3 mt-4">
            <GoldButton onClick={handleSave} disabled={saving || !isDirty}>
              {saving ? "저장 중..." : "저장"}
            </GoldButton>
            {isDirty && !saving && <span className="text-xs text-amber-400">저장되지 않은 변경사항이 있습니다</span>}
            {saved && <span className="text-xs text-emerald-400">저장됐습니다</span>}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
