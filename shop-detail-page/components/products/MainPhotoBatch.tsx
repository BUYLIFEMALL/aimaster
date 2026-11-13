"use client";
// 메이커 P2(2026-11-13) 「🛍 대표사진 일괄 만들기」 — 상품을 골라 바나나 「상품 대표사진 합성」 창으로 보내고,
// 돌아온 결과를 상품마다 대표사진 칸에 새 버전으로 저장한다(원본 사진은 그대로). 약속은 공용 product-photo-handoff 사본.
// 화면 모양은 agy 디자인 담당이 이어서 다듬는다(기능 담당 A 1차 화면).
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { imageSrc } from "@/lib/imageSrc";
import { uploadMainPhoto } from "@/lib/mainPhotoClient";
import { clearMainPhotoAction, setMainPhotoAction } from "@/lib/actions/mainPhoto";
import {
  PRODUCT_BATCH_URL, PRODUCT_MAX_PRODUCTS, PRODUCT_MSG_JOB, PRODUCT_MSG_SAVED, PRODUCT_RECEIVER_ORIGIN, isProductReady, readProductResult,
} from "@/lib/productPhotoHandoff";

export interface BatchProduct {
  id: string;
  label: string;
  source_image_url: string | null;
  reference_image_urls: string[] | null;
  main_image_url: string | null;
  updated_at: string;
}

type RowState = "" | "보내는 중" | "합성 대기" | "저장 중" | "저장됨" | string;
const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];

async function fetchPhoto(url: string): Promise<Blob> {
  const r = await fetch(imageSrc(url));
  if (!r.ok) throw new Error("사진을 불러오지 못했습니다.");
  const b = await r.blob();
  if (!PHOTO_TYPES.includes(b.type)) throw new Error("PNG·JPG·WEBP 사진만 보낼 수 있습니다.");
  return b;
}

export function MainPhotoBatch({ products }: { products: BatchProduct[] }) {
  const router = useRouter();
  const usable = products.filter((p) => p.source_image_url);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [subs, setSubs] = useState(1);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [notice, setNotice] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const winRef = useRef<Window | null>(null);
  const jobRef = useRef<{ jobId: string; list: BatchProduct[]; subs: number; ids: Set<string>; revisions: Map<string, string>; sent: boolean } | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());

  const mark = (id: string, s: RowState) => setRows((r) => ({ ...r, [id]: s }));

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const job = jobRef.current;
      if (!job || e.source !== winRef.current) return;
      if (isProductReady(e.origin, e.data)) {
        if (job.sent) return;
        job.sent = true;
        void sendJob(job);
        return;
      }
      const got = readProductResult(e.origin, e.data, job.jobId, job.ids);
      if (!got) return;
      if ("error" in got) { if (got.productId) mark(got.productId, got.error); return; }
      // 결과는 한 개씩 차례로 저장(같은 상품 이력 덮어쓰기 방지)
      chain.current = chain.current.then(async () => {
        mark(got.productId, "저장 중");
        const reply = (ok: boolean, error = "") => winRef.current?.postMessage({ type: PRODUCT_MSG_SAVED, jobId: job.jobId, productId: got.productId, ok, error }, PRODUCT_RECEIVER_ORIGIN);
        const up = await uploadMainPhoto(got.productId, got.file);
        if (!up.url) { mark(got.productId, up.error ?? "올리지 못했습니다."); reply(false, up.error); return; }
        const res = await setMainPhotoAction(got.productId, up.url, job.revisions.get(got.productId) ?? "");
        if (res.error) { mark(got.productId, res.error); reply(false, res.error); return; }
        if (res.updatedAt) job.revisions.set(got.productId, res.updatedAt);
        mark(got.productId, "저장됨"); reply(true);
        router.refresh();
      }).catch(() => mark(got.productId, "저장 중 오류가 났습니다."));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [router]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendJob(job: NonNullable<typeof jobRef.current>) {
    const { jobId, list, subs: subCount } = job;
    const payload = [];
    for (const p of list) {
      mark(p.id, "보내는 중");
      try {
        const urls = [p.source_image_url!, ...(p.reference_image_urls ?? []).slice(0, subCount)];
        const photos = await Promise.all(urls.map(async (u, i) => ({ role: i === 0 ? "main" : "sub", ref: u.split("/").pop() ?? "", file: await fetchPhoto(u) })));
        payload.push({ productId: p.id, label: p.label, baseRevision: p.updated_at, photos });
        mark(p.id, "합성 대기");
      } catch (e) { mark(p.id, e instanceof Error ? e.message : "사진을 불러오지 못했습니다."); }
    }
    if (!payload.length) { setNotice("보낼 수 있는 상품이 없습니다."); setRunning(false); return; }
    winRef.current?.postMessage({ type: PRODUCT_MSG_JOB, jobId, products: payload }, PRODUCT_RECEIVER_ORIGIN);
    setNotice(`바나나 창으로 상품 ${payload.length}개를 보냈습니다. 바나나에서 규칙을 확인하고 「일괄 만들기」를 누르면 여기 대표사진 칸에 차례로 저장됩니다.`);
    setRunning(false);
  }

  function start() {
    const list = usable.filter((p) => picked.has(p.id));
    if (!list.length) { setNotice("상품을 하나 이상 골라 주세요."); return; }
    const w = window.open(PRODUCT_BATCH_URL, "aimaster-product-batch");
    if (!w) { setNotice("팝업이 막혔습니다. 이 사이트의 팝업을 허용한 뒤 다시 눌러 주세요."); return; }
    winRef.current = w;
    jobRef.current = { jobId: crypto.randomUUID(), list, subs, ids: new Set(list.map((p) => p.id)), revisions: new Map(list.map((p) => [p.id, p.updated_at])), sent: false };
    setRunning(true); setRows({});
    setNotice("바나나 창이 열리면 사진을 보냅니다…");
  }

  async function clear(id: string) {
    const r = await clearMainPhotoAction(id);
    mark(id, r.error ?? "원본 사진으로 되돌림");
    if (!r.error) router.refresh();
  }

  if (!usable.length) return null;
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else if (n.size < PRODUCT_MAX_PRODUCTS) n.add(id); return n; });

  return (
    <section className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
      <button type="button" onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between text-left">
        <span className="text-sm font-extrabold text-slate-900">🛍 대표사진 일괄 만들기 <span className="text-xs font-medium text-slate-500">— 바나나에서 메인+서브 사진을 한 장으로 합성해 각 상품의 대표사진 칸에 저장(원본 그대로)</span></span>
        <span className="text-xs text-slate-500">{open ? "접기 ▴" : "펼치기 ▾"}</span>
      </button>
      {open && (
        <>
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-700">
            <button type="button" className="underline" onClick={() => setPicked(new Set(usable.slice(0, PRODUCT_MAX_PRODUCTS).map((p) => p.id)))}>모두 고르기</button>
            <button type="button" className="underline" onClick={() => setPicked(new Set())}>모두 빼기</button>
            <label className="flex items-center gap-1">서브 사진(참고 사진 앞에서)
              <select value={subs} onChange={(e) => setSubs(Number(e.target.value))} className="border border-slate-300 rounded px-1 py-0.5">
                {[0, 1, 2, 3].map((n) => <option key={n} value={n}>{n}장</option>)}
              </select>
            </label>
            <span className="text-slate-500">메인 = 상품 원본 사진 · 한 번에 {PRODUCT_MAX_PRODUCTS}개까지 · AI 비용 없음</span>
          </div>
          <ul className="max-h-72 overflow-auto divide-y divide-slate-100 border border-slate-100 rounded-xl">
            {usable.map((p) => (
              <li key={p.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                <input type="checkbox" checked={picked.has(p.id)} onChange={() => toggle(p.id)} aria-label={`${p.label} 고르기`} />
                <span className="flex-1 min-w-0 truncate font-semibold text-slate-800">{p.label}</span>
                <span className="text-slate-500 shrink-0">참고 {(p.reference_image_urls ?? []).length}장</span>
                {p.main_image_url && <span className="shrink-0 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5">합성 대표사진</span>}
                {rows[p.id] && <span className={`shrink-0 ${rows[p.id] === "저장됨" ? "text-emerald-600" : /오류|못|없|바뀌|막|넘|올바르/.test(rows[p.id]) ? "text-rose-600" : "text-slate-500"}`}>{rows[p.id]}</span>}
                {p.main_image_url && <button type="button" className="shrink-0 underline text-slate-500" onClick={() => void clear(p.id)}>원본으로</button>}
              </li>
            ))}
          </ul>
          <button type="button" disabled={running || !picked.size} onClick={start} className="btn-3d-blue py-2 px-4 rounded-xl text-xs font-extrabold text-white disabled:opacity-50">
            바나나에서 합성하기 ({picked.size}개)
          </button>
          {notice && <p className="text-xs text-slate-600" role="status">{notice}</p>}
        </>
      )}
    </section>
  );
}
