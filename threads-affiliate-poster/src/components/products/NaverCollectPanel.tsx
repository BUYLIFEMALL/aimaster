"use client";

// 2026-11-16 threads-auto(MIT) 이식 2단계 — 네이버 브랜드커넥트 링크 여러 개 → 확장이 실제 상품 페이지에서 수집 → 상품 등록.
// 확장과는 web-bridge.js와 window.postMessage로만 대화한다(같은 주소, source 'tap-app' ↔ 'tap-extension').
import { useCallback, useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/Button";
import {
  addNaverLinksAction,
  deleteNaverQueueAction,
  listNaverQueueAction,
  registerNaverCollectedAction,
  saveNaverCollectedAction,
  type NaverQueueRow,
} from "@/lib/actions/naverCollect";

const EXTENSION_ZIP = "/downloads/threads-affiliate-poster-extension-latest.zip";

type ExtResult = { ok: boolean; error?: string; version?: string; data?: unknown };

function callExtension(type: "status" | "collect", payload: Record<string, unknown>, timeoutMs: number): Promise<ExtResult> {
  return new Promise((resolve) => {
    const requestId = `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const timer = window.setTimeout(() => {
      window.removeEventListener("message", onMessage);
      resolve({ ok: false, error: type === "status" ? "확장이 설치되지 않았거나 꺼져 있습니다." : "확장 응답이 없습니다(시간 초과)." });
    }, timeoutMs);
    function onMessage(event: MessageEvent) {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const m = event.data as { source?: string; requestId?: string; result?: ExtResult };
      if (m?.source !== "tap-extension" || m.requestId !== requestId) return;
      window.clearTimeout(timer);
      window.removeEventListener("message", onMessage);
      resolve(m.result ?? { ok: false, error: "확장 응답을 읽지 못했습니다." });
    }
    window.addEventListener("message", onMessage);
    window.postMessage({ source: "tap-app", type, requestId, ...payload }, window.location.origin);
  });
}

const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  pending: { text: "대기", cls: "bg-neutral-100 text-neutral-700" },
  ready: { text: "준비됨", cls: "bg-emerald-100 text-emerald-800" },
  needs_review: { text: "확인 필요", cls: "bg-amber-100 text-amber-800" },
  registered: { text: "등록됨", cls: "bg-blue-100 text-blue-800" },
};

export function NaverCollectPanel() {
  const [text, setText] = useState("");
  const [rows, setRows] = useState<NaverQueueRow[]>([]);
  const [ext, setExt] = useState<{ checked: boolean; ok: boolean; version?: string }>({ checked: false, ok: false });
  const [message, setMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();

  const reload = useCallback(async () => {
    const res = await listNaverQueueAction();
    if (res.rows) setRows(res.rows);
    else if (res.error) setMessage(`⚠️ ${res.error}`);
  }, []);

  useEffect(() => {
    void reload();
    void callExtension("status", {}, 2500).then((r) => setExt({ checked: true, ok: r.ok, version: r.version }));
  }, [reload]);

  const addLinks = () =>
    startTransition(async () => {
      setMessage(null);
      const res = await addNaverLinksAction(text);
      if (res.error) setMessage(`⚠️ ${res.error}`);
      else {
        setMessage(`✅ ${res.added ?? 0}개를 넣었습니다.${res.duplicated ? ` (이미 있는 ${res.duplicated}개 건너뜀)` : ""}${res.rejected?.length ? ` · naver.me가 아닌 ${res.rejected.length}줄은 뺐습니다.` : ""}`);
        setText("");
      }
      await reload();
    });

  const collectAll = () =>
    startTransition(async () => {
      setMessage(null);
      const status = await callExtension("status", {}, 2500);
      setExt({ checked: true, ok: status.ok, version: status.version });
      if (!status.ok) {
        setMessage("⚠️ 확장이 연결되지 않았습니다. 아래 안내대로 설치한 뒤 이 화면을 새로고침해 주세요.");
        return;
      }
      const targets = rows.filter((r) => r.status === "pending" || r.status === "needs_review");
      let i = 0;
      for (const row of targets) {
        i++;
        setProgress(`${i} / ${targets.length} 수집 중… (내 브라우저에 탭이 잠깐 열렸다 닫힙니다)`);
        const r = await callExtension("collect", { url: row.affiliate_url }, 60000);
        await saveNaverCollectedAction(row.id, r.ok ? r.data : null, r.ok ? undefined : r.error || "수집 실패");
        await reload();
      }
      setProgress(null);
      setMessage(targets.length ? "✅ 수집을 마쳤습니다. 「준비됨」 항목을 골라 등록하세요." : "수집할 항목이 없습니다.");
    });

  const registerChecked = () =>
    startTransition(async () => {
      const res = await registerNaverCollectedAction([...checked]);
      setMessage(res.error ? `⚠️ ${res.error}` : `✅ 상품 ${res.inserted ?? 0}개를 등록했습니다. 게시글 작성에서 고를 수 있습니다.`);
      setChecked(new Set());
      await reload();
    });

  const ready = rows.filter((r) => r.status === "ready");

  return (
    <div className="space-y-3 rounded-lg border border-neutral-200 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-neutral-900">🔗 링크 여러 개로 상품 정보 자동 가져오기</p>
        <span className={`whitespace-nowrap rounded px-2 py-0.5 text-[11px] font-semibold ${ext.ok ? "bg-emerald-100 text-emerald-800" : "bg-neutral-100 text-neutral-600"}`}>
          {!ext.checked ? "확장 확인 중…" : ext.ok ? `확장 연결됨 ${ext.version ?? ""}` : "확장 미연결"}
        </span>
      </div>
      <p className="text-xs text-neutral-500">
        브랜드커넥트에서 발급한 <b>naver.me</b> 링크를 줄마다 하나씩 붙여 넣으면, 크롬 확장이 <b>내 브라우저</b>에서 링크를 열어 실제 상품 페이지의
        상품명·이미지·후기(최대 8개)를 가져옵니다. 가져온 정보는 글 생성 근거로만 쓰이고 30일 뒤 자동 삭제됩니다.
      </p>
      {!ext.ok && ext.checked && (
        <ol className="space-y-1 rounded-md bg-amber-50 p-3 text-xs leading-relaxed text-neutral-800">
          <li><b>1단계.</b> <a href={EXTENSION_ZIP} className="font-semibold text-blue-700 underline">확장 ZIP 내려받기</a> 후 압축을 풉니다.</li>
          <li><b>2단계.</b> 크롬 주소창에 <code>chrome://extensions</code> → 오른쪽 위 <b>개발자 모드</b> 켜기 → <b>압축해제된 확장 프로그램을 로드</b>로 푼 폴더 선택.</li>
          <li><b>3단계.</b> 이 화면을 새로고침하면 「확장 연결됨」으로 바뀝니다. (새 버전이 나오면 같은 폴더에 덮어쓰고 확장 새로고침)</li>
        </ol>
      )}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        aria-label="naver.me 링크 목록"
        placeholder={"https://naver.me/AbCdEf12\nhttps://naver.me/GhIjKl34"}
        className="w-full rounded-md border border-neutral-300 bg-white p-2 text-sm text-neutral-900"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={addLinks} disabled={isPending || !text.trim()} className="whitespace-nowrap">목록에 넣기</Button>
        <Button type="button" onClick={collectAll} disabled={isPending || !rows.some((r) => r.status === "pending" || r.status === "needs_review")} className="whitespace-nowrap">
          확장으로 정보 가져오기
        </Button>
        <Button type="button" variant="secondary" onClick={registerChecked} disabled={isPending || checked.size === 0} className="whitespace-nowrap">
          선택한 {checked.size}개 상품으로 등록
        </Button>
      </div>
      {progress && <p className="text-xs text-neutral-700">{progress}</p>}
      {message && <p className="text-xs text-neutral-700">{message}</p>}
      {rows.length > 0 && (
        <ul className="space-y-2">
          {rows.map((r) => {
            const label = STATUS_LABEL[r.status] ?? STATUS_LABEL.pending;
            const images = Array.isArray(r.image_urls) ? (r.image_urls as string[]) : [];
            const reviewCount = Array.isArray(r.reviews) ? r.reviews.length : 0;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-lg border border-neutral-200 p-2">
                <input
                  type="checkbox"
                  aria-label={`${r.product_name ?? r.affiliate_url} 선택`}
                  disabled={r.status !== "ready"}
                  checked={checked.has(r.id)}
                  onChange={() => setChecked((prev) => { const n = new Set(prev); if (n.has(r.id)) n.delete(r.id); else n.add(r.id); return n; })}
                  className="shrink-0"
                />
                {images[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={images[0]} alt="" referrerPolicy="no-referrer" className="h-12 w-12 shrink-0 rounded object-cover" />
                ) : (
                  <div className="h-12 w-12 shrink-0 rounded bg-neutral-100" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-neutral-900">{r.product_name || r.affiliate_url}</p>
                  <p className="flex flex-wrap gap-1 text-[11px] text-neutral-500">
                    <span className={`whitespace-nowrap rounded px-1.5 py-0.5 font-semibold ${label.cls}`}>{label.text}</span>
                    {r.connect_kind && <span className="whitespace-nowrap">{r.connect_kind === "TRAVEL" ? "여행 커넥트" : "쇼핑 커넥트"}</span>}
                    {r.status !== "pending" && !r.error && <span className="whitespace-nowrap">이미지 {images.length}장 · 후기 근거 {reviewCount}건</span>}
                    {r.error && <span className="text-amber-700">{r.error}</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startTransition(async () => { await deleteNaverQueueAction(r.id); await reload(); })}
                  className="shrink-0 whitespace-nowrap text-xs text-neutral-500 underline"
                >
                  삭제
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {ready.length > 1 && (
        <button type="button" className="text-xs text-neutral-600 underline" onClick={() => setChecked(new Set(ready.map((r) => r.id)))}>
          준비됨 {ready.length}개 모두 선택
        </button>
      )}
    </div>
  );
}
