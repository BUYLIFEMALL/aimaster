"use client";

// 병합 B-8(콘텐츠 메이커 → SEO 스튜디오): 원고 기반 SNS 공유 문구(스레드·X·페이스북). 누를 때만 회원 본인 키로 1회 호출.
import { useState } from "react";
import { reviewHash } from "@/lib/draftReview";
import { SOCIAL_PLATFORMS, readSocial, withPostUrl, type SocialCopy } from "@/lib/socialCopy";
import type { DraftRecord } from "./shared";

export function SocialCopyPanel({ draft, provider, model, onSaved }: {
  draft: DraftRecord; provider: string; model: string; onSaved: (seoReport: Record<string, unknown>) => void;
}) {
  const report = (draft.seo_report ?? null) as Record<string, unknown> | null;
  const [local, setLocal] = useState<SocialCopy | null>(null);
  const social = local ?? readSocial(report?.social);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const run = report?.autoPublish && typeof report.autoPublish === "object" ? report.autoPublish as Record<string, unknown> : null;
  const postUrl = run?.state === "published" && typeof run.url === "string" ? run.url : null;
  const stale = Boolean(social && social.bodyHash !== reviewHash(draft.title, draft.body));

  const create = async () => {
    if (busy || !draft.id) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/drafts/${draft.id}/social`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ provider, model }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.social) throw new Error(data.error || "공유 문구를 만들지 못했습니다.");
      setLocal(data.social);
      if (data.seoReport) onSaved(data.seoReport);
      setMessage({ text: data.saved ? "공유 문구를 만들었습니다." : "공유 문구를 만들었습니다(자동 포스팅 중이라 원고에는 저장하지 않았습니다).", ok: true });
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : "공유 문구를 만들지 못했습니다.", ok: false });
    } finally { setBusy(false); }
  };
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setMessage({ text: "복사했습니다.", ok: true }); }
    catch { setMessage({ text: "복사에 실패했습니다. 브라우저의 클립보드 권한을 확인해주세요.", ok: false }); }
  };

  return (
    <section className="quality-panel card" aria-labelledby="social-copy-title">
      <div className="card-head">
        <div>
          <h2 id="social-copy-title" className="card-title">SNS 공유 문구</h2>
          <p className="draft-result-subtitle">저장된 원고 내용만으로 스레드·X·페이스북 문구를 만듭니다(본인 AI 키 1회). 원고에 없는 체험·수치는 넣지 않게 지시합니다. {postUrl ? "복사할 때 발행한 네이버 글 주소를 끝에 붙입니다." : "아직 발행 전이라 글 주소는 발행 뒤 직접 붙여 주세요."}</p>
        </div>
        {stale && <span className="quality-score low">원고가 바뀜 · 다시 만들기 권장</span>}
      </div>
      {social?.items.length ? (
        <div style={{ display: "grid", gap: 8 }}>
          {social.items.map((item) => {
            const p = SOCIAL_PLATFORMS.find((x) => x.key === item.platform)!;
            const text = withPostUrl(item, postUrl);
            return (
              <div key={item.platform} style={{ border: "1px solid var(--line, #e5e7eb)", borderRadius: 8, padding: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                  <strong>{p.label}</strong>
                  <span style={{ fontSize: 12 }}>{text.length.toLocaleString("ko-KR")} / {p.max}자 <button type="button" className="secondary compact" onClick={() => void copy(text)}>복사</button></span>
                </div>
                <p style={{ whiteSpace: "pre-wrap", margin: "6px 0 0", fontSize: 14 }}>{text}</p>
              </div>
            );
          })}
        </div>
      ) : <p className="quality-empty">아직 만든 공유 문구가 없습니다.</p>}
      <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
        <button type="button" className="secondary compact" disabled={busy || !draft.id} onClick={() => void create()}>{busy ? "만드는 중…" : social ? "다시 만들기" : "문구 만들기"}</button>
      </div>
      {message && <p role="status" className={message.ok ? "draft-result-subtitle" : "experience-question-error"}>{message.text}</p>}
    </section>
  );
}
