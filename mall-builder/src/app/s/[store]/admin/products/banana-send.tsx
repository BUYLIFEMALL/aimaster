"use client";
// 메이커 연계 M1(2026-11-19, Master msg_336575c1b8e9) 「🛍 바나나로 대표사진 보내기」 — 목록에서 고른 상품(기존 「고르기」 체크박스)의 사진을
// 바나나 「상품 대표사진 합성」 창으로 보낸다. 약속은 공용 사본 productPhotoHandoff(기준 banana-canvas), 작업 만들기는 lib/mallPhotoJob.
// M1은 보내기까지: 돌아온 결과는 저장하지 않고(사진 제안 저장은 M2) 그 결과 번호로 「아직 받을 수 없음」 고정 응답만 한 번 보낸다(재시도 0).
// 바나나는 운영 주소(mall-builder.buylife.xyz)에서 연 창만 받으므로 Lab·내 PC에서는 보내지 않고 안내만 한다.
import { useEffect, useRef, useState } from "react";
import {
  PRODUCT_MALL_ORIGIN, PRODUCT_MSG_JOB, PRODUCT_PHOTO_MAX_BYTES, PRODUCT_RECEIVER_ORIGIN, isProductReady, productBatchUrl, readProductResult,
} from "@/lib/productPhotoHandoff";
import { notReadyReply, planMallPhotoJob, type MallPhotoItem, type MallPhotoRow, type MallPhotoSkip } from "@/lib/mallPhotoJob";

const PHOTO_TYPES = ["image/png", "image/jpeg", "image/webp"];

async function fetchPhoto(url: string): Promise<Blob> {
  const r = await fetch(url);
  if (!r.ok) throw new Error("사진을 불러오지 못했습니다.");
  const b = await r.blob();
  if (!PHOTO_TYPES.includes(b.type)) throw new Error("PNG·JPG·WEBP 사진만 보낼 수 있습니다.");
  if (b.size === 0 || b.size > PRODUCT_PHOTO_MAX_BYTES) throw new Error("25MB 이하 사진만 보낼 수 있습니다.");
  return b;
}

type Job = { jobId: string; items: MallPhotoItem[]; ids: Set<string>; sent: boolean; answered: Set<string> };

export function BananaSend({ rows }: { rows: MallPhotoRow[] }) {
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, string>>({});
  const [skipped, setSkipped] = useState<MallPhotoSkip[]>([]);
  const winRef = useRef<Window | null>(null);
  const jobRef = useRef<Job | null>(null);
  const mark = (id: string, s: string) => setStatus((m) => ({ ...m, [id]: s }));

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      const job = jobRef.current;
      if (!job || !winRef.current || e.source !== winRef.current) return;
      if (isProductReady(e.origin, e.data)) {
        if (job.sent) return; // 작업은 한 번만
        job.sent = true;
        void sendJob(job);
        return;
      }
      const got = readProductResult(e.origin, e.data, job.jobId, job.ids);
      if (!got || "error" in got) return;
      // 같은 결과 번호에는 한 번만 응답(저장 0·재시도 0)
      const key = `${got.productId}:${got.resultId ?? ""}:${got.settingsVersion}`;
      if (job.answered.has(key)) return;
      job.answered.add(key);
      winRef.current.postMessage(notReadyReply(job.jobId, got), PRODUCT_RECEIVER_ORIGIN);
      mark(got.productId, "결과 도착 — 쇼핑몰 저장은 준비 중(바나나에서 내려받기)");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function sendJob(job: Job) {
    const products = [];
    for (const it of job.items) {
      mark(it.productId, "사진 읽는 중");
      try {
        const photos = await Promise.all(it.photos.map(async (p) => ({ role: p.role, ref: p.url.split("/").pop() ?? "", file: await fetchPhoto(p.url) })));
        products.push({ productId: it.productId, label: it.label, baseRevision: it.baseRevision, photos });
        mark(it.productId, "바나나로 보냄");
      } catch (err) {
        job.ids.delete(it.productId);
        mark(it.productId, err instanceof Error ? err.message : "사진을 불러오지 못했습니다.");
      }
    }
    if (!products.length) { setNotice("보낼 수 있는 상품이 없습니다."); return; }
    winRef.current?.postMessage({ type: PRODUCT_MSG_JOB, jobId: job.jobId, products }, PRODUCT_RECEIVER_ORIGIN);
    setNotice(`바나나 창으로 상품 ${products.length}개를 보냈습니다. 바나나에서 합성·내려받기를 하세요(쇼핑몰에 바로 저장하는 기능은 준비 중).`);
  }

  function start() {
    const picked = Array.from(document.querySelectorAll<HTMLInputElement>('form[data-product-bulk-form] input[name="ids"]:checked')).map((el) => el.value);
    const plan = planMallPhotoJob(rows, picked);
    setSkipped(plan.skipped); setStatus({});
    if (!picked.length) { setNotice("목록에서 상품을 하나 이상 골라 주세요."); return; }
    if (!plan.items.length) { setNotice("고른 상품 중 보낼 수 있는 상품이 없습니다(아래 이유)."); return; }
    if (window.location.origin !== PRODUCT_MALL_ORIGIN) { setNotice(`바나나는 운영 쇼핑몰 주소(${PRODUCT_MALL_ORIGIN})에서 연 창만 받습니다. 이 주소에서는 보내지 않습니다.`); return; }
    const w = window.open(productBatchUrl("mall"), "aimaster-product-batch");
    if (!w) { setNotice("팝업이 막혔습니다. 이 사이트의 팝업을 허용한 뒤 다시 눌러 주세요."); return; }
    winRef.current = w;
    jobRef.current = { jobId: crypto.randomUUID(), items: plan.items, ids: new Set(plan.items.map((i) => i.productId)), sent: false, answered: new Set() };
    setNotice("바나나 창이 열리면 사진을 보냅니다…");
  }

  const names = new Map(rows.map((r) => [r.id, r.name]));
  return (
    <div className="mt-3 rounded-lg border border-dashed px-3 py-2 text-sm" data-banana-send>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={start} className="rounded border px-3 py-1 hover:bg-gray-50">🛍 고른 상품 바나나로 대표사진 보내기</button>
        <span className="text-xs text-gray-500">메인 = 첫 사진, 서브 = 다음 사진(최대 4장) · 분양몰 거울 상품·사진 없는 상품은 빠짐 · AI 비용 없음</span>
      </div>
      {notice && <p className="mt-2 text-xs text-gray-700" role="status">{notice}</p>}
      {(Object.keys(status).length > 0 || skipped.length > 0) && (
        <ul className="mt-2 space-y-0.5 text-xs">
          {Object.entries(status).map(([id, s]) => <li key={id}><b>{names.get(id) ?? "상품"}</b> — {s}</li>)}
          {skipped.map((s) => <li key={s.productId} className="text-amber-700"><b>{s.label}</b> — {s.reason}</li>)}
        </ul>
      )}
    </div>
  );
}
