"use client";

// 발행 패널 — 블로그 핵심 지침: 회원이 고른 방식(발행 전까지·바로 발행·예약)으로만, 결과 기록, 불확실하면 다시 보내지 않음.
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePersisted } from "@/lib/client/usePersisted";

export type PublishState = {
  id: string;
  platform: "wordpress" | "blogger";
  status: string;
  remoteId: string | null;
  remoteUrl: string | null;
  scheduledAt: string | null;
  errorDetail: string | null;
  /** 원고 보관 만료(만든 날+30일) — 예약 상한 계산용 */
  expiresAt?: string | null;
};

const MODES = [
  { id: "draft", icon: "📝", label: "발행 전까지", desc: "블로그에 초안으로만 저장 · 발행 버튼은 내가 누름" },
  { id: "publish", icon: "⚡", label: "바로 발행", desc: "지금 공개됩니다" },
  { id: "schedule", icon: "⏰", label: "예약 발행", desc: "정한 시각에 블로그가 직접 공개 · PC를 꺼도 됨" },
] as const;

/** 한국 시간 입력값(YYYY-MM-DDTHH:mm) → ISO */
export const kstToIso = (v: string) => new Date(`${v}:00+09:00`).toISOString();
const isoToKstLabel = (iso: string) => new Date(Date.parse(iso) + 9 * 3600_000).toISOString().slice(0, 16).replace("T", " ");
const isoToKstInput = (ms: number) => new Date(ms + 9 * 3600_000).toISOString().slice(0, 16);

export function PublishPanel({ post, canPublish, connected }: { post: PublishState; canPublish: boolean; connected: boolean }) {
  const router = useRouter();
  // 선택값은 원고별로 기억 — 저장 뒤 화면이 다시 그려져도 초기화되지 않게(맥미니 검수 2026-11-11)
  const [mode, setMode] = usePersisted<(typeof MODES)[number]["id"]>(`wba:${post.id}:mode`, "draft");
  const [when, setWhen] = usePersisted<string>(`wba:${post.id}:when`, isoToKstInput(Date.now() + 60 * 60_000));
  const [picked, setPicked] = usePersisted<number[]>(`wba:${post.id}:cats`, []);
  const [cats, setCats] = useState<{ id: number; name: string }[] | null>(null);
  const [catState, setCatState] = useState<"idle" | "loading" | "error">("idle");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  // 예약 상한: 원고 보관 만료 하루 전(발행 전 원고는 30일 뒤 이미지와 함께 지워짐)
  const maxWhen = post.expiresAt ? isoToKstInput(Date.parse(post.expiresAt) - 24 * 3600_000) : undefined;
  const minWhen = isoToKstInput(Date.now() + 5 * 60_000);

  async function loadCats() {
    setCatState("loading");
    try {
      const r = await fetch("/api/connect/wordpress?categories=1");
      const d = await r.json().catch(() => ({}));
      if (!r.ok || !Array.isArray(d.categories)) throw new Error();
      setCats(d.categories);
      setCatState("idle");
    } catch {
      setCats(null);
      setCatState("error");
    }
  }
  useEffect(() => {
    if (post.platform !== "wordpress" || !connected || post.remoteId) return;
    void loadCats();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.platform, connected, post.remoteId]);

  async function publish(forceMode?: "publish" | "schedule") {
    const m = MODES.find((x) => x.id === (forceMode ?? mode))!;
    const mode2 = m.id;
    if (mode2 === "schedule" && maxWhen && when > maxWhen) { setError(`예약은 ${maxWhen.replace("T", " ")}(한국 시간)까지만 할 수 있습니다. 발행 전 원고는 만든 날부터 30일 뒤 이미지와 함께 지워집니다.`); return; }
    const msg = mode2 === "publish" ? "지금 바로 공개됩니다. 발행할까요?" : mode2 === "schedule" ? `${when.replace("T", " ")}(한국 시간)에 공개되도록 예약할까요?` : "블로그에 초안으로 저장할까요?";
    if (!window.confirm(msg)) return;
    setBusy("publish"); setError("");
    const res = await fetch(`/api/posts/${post.id}/publish`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: m.id, scheduledAt: mode2 === "schedule" ? kstToIso(when) : undefined, categoryIds: picked }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setBusy("");
    if (!res || !res.ok) setError(data.error ?? "결과를 확인하지 못했습니다. 블로그에서 글이 올라갔는지 먼저 확인해 주세요.");
    router.refresh();
  }

  const [url, setUrl] = useState("");
  async function resolve(outcome: "sent" | "not_sent") {
    const msg = outcome === "sent" ? "블로그에 글이 올라간 것을 확인하셨나요?" : "블로그에 글이 없는 것을 확인하셨나요? 다시 보낼 수 있게 됩니다(실제로 올라가 있으면 중복 발행됩니다).";
    if (!window.confirm(msg)) return;
    setBusy("resolve"); setError("");
    const res = await fetch(`/api/posts/${post.id}/resolve`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ outcome, url }) });
    const data = await res.json().catch(() => ({}));
    setBusy("");
    if (!res.ok) setError(data.error ?? "저장하지 못했습니다.");
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
  const stuck = post.status === "publishing";
  if (post.remoteId || post.status === "uncertain" || stuck) {
    return (
      <div className="lp-card space-y-2">
        <p className="text-sm font-black">🚀 발행 결과</p>
        {post.status === "published" && <p className="text-sm">✅ 공개됐습니다.</p>}
        {post.status === "scheduled" && post.scheduledAt && <p className="text-sm">⏰ {isoToKstLabel(post.scheduledAt)}(한국 시간)에 공개 예약됨</p>}
        {post.status === "draft" && (
          <div className="space-y-2">
            <p className="text-sm">📝 블로그에 초안으로 저장됨 — 여기서 바로 발행·예약하거나, 블로그 관리 화면에서 직접 발행해도 됩니다.</p>
            <p className="text-xs text-[color:var(--muted)]">같은 글의 상태만 바꾸므로 블로그에 글이 두 개 생기지 않습니다.</p>
            <label className="block text-xs font-extrabold text-[color:var(--muted)]">예약 시각(한국 시간, 예약할 때만)
              <input type="datetime-local" value={when} min={minWhen} max={maxWhen} onChange={(e) => setWhen(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-[color:var(--border)] px-3 py-2 text-sm" />
              {maxWhen && <span className="mt-1 block font-medium">{maxWhen.replace("T", " ")}까지 — 발행 전 원고는 30일 뒤 이미지와 함께 지워집니다.</span>}
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => publish("publish")} disabled={!!busy || !connected} className="lp-btn flex-1 justify-center disabled:opacity-50">{busy === "publish" ? "보내는 중…" : "⚡ 바로 발행"}</button>
              <button type="button" onClick={() => publish("schedule")} disabled={!!busy || !connected} className="lp-btn-ghost flex-1 justify-center disabled:opacity-50">⏰ 예약 발행</button>
            </div>
          </div>
        )}
        {stuck && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">⏳ 보내는 중입니다. 10분이 지나도 그대로면 블로그에서 확인한 뒤 아래에서 정리해 주세요.</p>}
        {post.status === "uncertain" && <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">⚠️ 보냈지만 결과를 확인하지 못했습니다. 중복을 막기 위해 다시 보내지 않습니다. 블로그 관리 화면에서 글이 올라갔는지 확인해 주세요.</p>}
        {(post.status === "uncertain" || stuck) && (
          <div className="space-y-2 rounded-xl border-2 border-[color:var(--border)] p-2">
            <p className="text-xs font-extrabold">블로그에서 확인한 결과</p>
            <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="올라간 글 주소(선택) https://..." className="w-full rounded-lg border-2 border-[color:var(--border)] px-2 py-1.5 text-xs" />
            <div className="flex gap-2">
              <button type="button" onClick={() => resolve("sent")} disabled={!!busy} className="flex-1 rounded-lg bg-green-600 px-2 py-1.5 text-xs font-bold text-white disabled:opacity-50">올라갔어요</button>
              <button type="button" onClick={() => resolve("not_sent")} disabled={!!busy} className="flex-1 rounded-lg bg-slate-600 px-2 py-1.5 text-xs font-bold text-white disabled:opacity-50">안 올라갔어요</button>
            </div>
          </div>
        )}
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
        <label className="block text-xs font-extrabold text-[color:var(--muted)]">예약 시각(한국 시간, 5분 뒤 ~ 원고 보관 만료 하루 전까지)
          <input type="datetime-local" value={when} min={minWhen} max={maxWhen} onChange={(e) => setWhen(e.target.value)} className="mt-1 w-full rounded-xl border-2 border-[color:var(--border)] px-3 py-2 text-sm" />
          <span className="mt-1 block font-medium">{maxWhen ? `${maxWhen.replace("T", " ")}까지 고를 수 있습니다. ` : ""}발행 전 원고는 만든 날부터 30일 뒤 이미지와 함께 지워져, 그보다 늦은 예약은 이미지가 깨집니다.</span>
        </label>
      )}
      {post.platform === "wordpress" && connected && catState === "loading" && <p className="text-xs text-[color:var(--muted)]">카테고리 불러오는 중…</p>}
      {post.platform === "wordpress" && connected && catState === "error" && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="flex-1">카테고리를 불러오지 못했습니다. 카테고리 없이 보내도 됩니다.</span>
          <button type="button" onClick={() => void loadCats()} className="rounded-lg bg-amber-600 px-2.5 py-1 font-bold text-white">다시 불러오기</button>
        </div>
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
      <button type="button" onClick={() => publish()} disabled={!canPublish || !connected || !!busy} className="lp-btn w-full disabled:opacity-50">
        {busy === "publish" ? "보내는 중… 창을 닫지 마세요" : mode === "publish" ? "⚡ 바로 발행" : mode === "schedule" ? "⏰ 예약 발행" : "📝 초안으로 보내기"}
      </button>
      {!canPublish && <p className="text-xs text-amber-700">고친 내용을 먼저 저장해 주세요.</p>}
      {post.errorDetail && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">지난 시도: {post.errorDetail}</p>}
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm font-semibold text-red-800">⚠️ {error}</p>}
    </div>
  );
}
