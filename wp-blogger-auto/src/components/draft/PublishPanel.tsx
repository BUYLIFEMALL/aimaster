"use client";

// 발행 패널 — 블로그 핵심 지침: 회원이 고른 방식(발행 전까지·바로 발행·예약)으로만, 결과 기록, 불확실하면 다시 보내지 않음.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export type PublishState = {
  id: string;
  platform: "wordpress" | "blogger";
  status: string;
  remoteId: string | null;
  remoteUrl: string | null;
  scheduledAt: string | null;
  errorDetail: string | null;
};

const MODES = [
  { id: "draft", icon: "📝", label: "발행 전까지", desc: "블로그에 초안으로만 저장 · 발행 버튼은 내가 누름" },
  { id: "publish", icon: "⚡", label: "바로 발행", desc: "지금 공개됩니다" },
  { id: "schedule", icon: "⏰", label: "예약 발행", desc: "정한 시각에 블로그가 직접 공개 · PC를 꺼도 됨" },
] as const;

/** 한국 시간 입력값(YYYY-MM-DDTHH:mm) → ISO */
export const kstToIso = (v: string) => new Date(`${v}:00+09:00`).toISOString();
const isoToKstLabel = (iso: string) => new Date(Date.parse(iso) + 9 * 3600_000).toISOString().slice(0, 16).replace("T", " ");

export function PublishPanel({ post, canPublish, connected }: { post: PublishState; canPublish: boolean; connected: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("draft");
  const [when, setWhen] = useState(() => new Date(Date.now() + 9 * 3600_000 + 60 * 60_000).toISOString().slice(0, 16));
  const [cats, setCats] = useState<{ id: number; name: string }[] | null>(null);
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (post.platform !== "wordpress" || !connected || post.remoteId) return;
    fetch("/api/connect/wordpress?categories=1").then((r) => r.json()).then((d) => setCats(Array.isArray(d.categories) ? d.categories : [])).catch(() => setCats([]));
  }, [post.platform, connected, post.remoteId]);

  async function publish() {
    const m = MODES.find((x) => x.id === mode)!;
    const msg = mode === "publish" ? "지금 바로 공개됩니다. 발행할까요?" : mode === "schedule" ? `${when.replace("T", " ")}(한국 시간)에 공개되도록 예약할까요?` : "블로그에 초안으로 저장할까요?";
    if (!window.confirm(msg)) return;
    setBusy("publish"); setError("");
    const res = await fetch(`/api/posts/${post.id}/publish`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: m.id, scheduledAt: mode === "schedule" ? kstToIso(when) : undefined, categoryIds: picked }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy("");
    if (!res || !res.ok) setError(data.error ?? "결과를 확인하지 못했습니다. 블로그에서 글이 올라갔는지 먼저 확인해 주세요.");
    router.refresh();
  }

  async function cancel() {
    if (!window.confirm("예약을 취소하고 블로그 초안으로 되돌릴까요?")) return;
    setBusy("cancel"); setError("");
    const res = await fetch(`/api/posts/${post.id}/publish`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) setError(data.error ?? "예약을 취소하지 못했습니다.");
    router.refresh();
  }

  // 이미 블로그에 올라간 원고: 결과만
  if (post.remoteId || post.status === "uncertain") {
    return (
      <div className="lp-card space-y-2">
        <p className="text-sm font-black">🚀 발행 결과</p>
        {post.status === "published" && <p className="text-sm">✅ 공개됐습니다.</p>}
        {post.status === "scheduled" && post.scheduledAt && <p className="text-sm">⏰ {isoToKstLabel(post.scheduledAt)}(한국 시간)에 공개 예약됨</p>}
        {post.status === "draft" && <p className="text-sm">📝 블로그에 초안으로 저장됨 — 블로그 관리 화면에서 발행 버튼을 눌러 주세요.</p>}
        {post.status === "uncertain" && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">⚠️ 보냈지만 결과를 확인하지 못했습니다. 중복을 막기 위해 다시 보내지 않습니다. 블로그 관리 화면에서 글이 올라갔는지 확인해 주세요.</p>}
        {post.errorDetail && post.status !== "uncertain" && <p className="text-xs text-amber-700">{post.errorDetail}</p>}
        {post.remoteUrl && <a href={post.remoteUrl} target="_blank" rel="noreferrer" className="lp-btn-ghost w-full justify-center">블로그에서 열기 ↗</a>}
        {post.status === "scheduled" && <button type="button" onClick={cancel} disabled={!!busy} className="w-full rounded-xl px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50">{busy === "cancel" ? "취소하는 중…" : "예약 취소(초안으로)"}</button>}
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">⚠️ {error}</p>}
      </div>
    );
  }

  return (
    <div className="lp-card space-y-3">
      <p className="text-sm font-black">🚀 발행 — {post.platform === "wordpress" ? "워드프레스" : "구글 블로그"}</p>
      {!connected && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">블로그 연결이 필요합니다. <a href="/connect" className="font-bold underline">연결하러 가기</a></p>}
      <div className="space-y-2">
        {MODES.map((m) => (
          <button key={m.id} type="button" onClick={() => setMode(m.id)} className={`flex w-full gap-2 rounded-xl border-2 px-3 py-2 text-left ${mode === m.id ? "border-[color:var(--launch)] bg-green-50" : "border-[color:var(--border)] bg-white"}`}>
            <span>{m.icon}</span><span><b className="text-sm">{m.label}</b><span className="block text-xs text-[color:var(--muted)]">{m.desc}</span></span>
          </button>
        ))}
      </div>
      {mode === "schedule" && (
        <label className="block text-xs font-extrabold text-[color:var(--muted)]">예약 시각(한국 시간, 5분 뒤~1년 안)
          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-[color:var(--border)] px-3 py-2 text-sm" />
        </label>
      )}
      {post.platform === "wordpress" && cats && cats.length > 0 && (
        <div>
          <p className="text-xs font-extrabold text-[color:var(--muted)]">카테고리(선택)</p>
          <div className="mt-1 flex max-h-32 flex-wrap gap-1.5 overflow-y-auto">
            {cats.map((c) => (
              <button key={c.id} type="button" onClick={() => setPicked((p) => (p.includes(c.id) ? p.filter((x) => x !== c.id) : [...p, c.id]))} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${picked.includes(c.id) ? "bg-[color:var(--wp)] text-white" : "bg-[color:var(--surface-soft)]"}`}>{c.name}</button>
            ))}
          </div>
        </div>
      )}
      <button type="button" onClick={publish} disabled={!canPublish || !connected || !!busy} className="lp-btn w-full disabled:opacity-50">
        {busy === "publish" ? "보내는 중… 창을 닫지 마세요" : mode === "publish" ? "⚡ 바로 발행" : mode === "schedule" ? "⏰ 예약 발행" : "📝 초안으로 보내기"}
      </button>
      {!canPublish && <p className="text-xs text-amber-700">고친 내용을 먼저 저장해 주세요.</p>}
      {post.errorDetail && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">지난 시도: {post.errorDetail}</p>}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">⚠️ {error}</p>}
    </div>
  );
}
