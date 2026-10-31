"use client";

import { useEffect, useState, useTransition } from "react";
import { acknowledgeOrdersAction, listOrderSheetsAction, submitInvoicesAction } from "@/lib/actions/orders";
import { ACK_MAX, INVOICE_UPDATE_STATUSES, INVOICE_UPLOAD_STATUS, ORDER_STATUSES, orderStatusLabel, parseInvoicePaste, type AckResult, type OrderSheet } from "@/lib/coupang/orders";
import { COMMON_COURIERS } from "@/lib/coupang/defaults";
import { chunk, matchInvoiceFile, orderFileRows } from "@/lib/coupang/orderFile";
import { cancelOrderAction } from "@/lib/actions/returns";
import { ACCEPT_SHEETS, readSheet, saveWorkbook } from "@/lib/sheet";
import { CANCEL_REASONS } from "@/lib/coupang/returns";

const input = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none";
/** 한국 시간 기준 오늘에서 n일 전 날짜(yyyy-mm-dd) */
const kstDay = (back: number) => new Date(Date.now() + 9 * 3_600_000 - back * 86_400_000).toISOString().slice(0, 10);

export function OrderSheets({ keysSaved, defaultCourier, initialStatus = "", autoLoad = false }: { keysSaved: boolean; defaultCourier: string; initialStatus?: string; autoLoad?: boolean }) {
  const [status, setStatus] = useState(ORDER_STATUSES.some((s) => s.value === initialStatus) ? initialStatus : "ACCEPT");
  const [from, setFrom] = useState(kstDay(initialStatus ? 30 : 6)); // 「오늘 할 일」에서 넘어오면 그 숫자와 같은 31일
  const [to, setTo] = useState(kstDay(0));
  const [orders, setOrders] = useState<OrderSheet[]>([]);
  const [next, setNext] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [shownStatus, setShownStatus] = useState(""); // 지금 목록을 불러온 상태(결제완료일 때만 상품준비중 처리)
  const [picked, setPicked] = useState<number[]>([]);
  const [asking, setAsking] = useState<"" | "ack" | "ackFile" | "invoice">(""); // 쿠팡에 보내기 전 한 번 더 묻는 단계
  const [inv, setInv] = useState<Record<number, { courier: string; invoice: string }>>({}); // 배송번호별 송장 입력
  const [paste, setPaste] = useState("");
  const [moved, setMoved] = useState<number[]>([]); // A4: 상품준비중 처리 뒤 배송지가 바뀐 배송번호
  const [cancelling, setCancelling] = useState<{ box: number; reason: string } | null>(null); // 판매자 취소 확인 단계
  const [ackNote, setAckNote] = useState("");
  const [ackResults, setAckResults] = useState<AckResult[]>([]);

  const load = (more: boolean) =>
    start(async () => {
      setError("");
      const r = await listOrderSheetsAction({ from, to, status, nextToken: more ? next : undefined });
      if (!r.ok) return setError(r.error);
      setOrders(more ? [...orders, ...r.orders] : r.orders);
      setNext(r.nextToken);
      setLoaded(true);
      setShownStatus(status);
      if (!more) {
        setPicked([]);
        setInv({});
        setMoved([]);
        setAckResults([]);
        setAckNote("");
      }
    });

  const canAck = shownStatus === "ACCEPT";
  const invoiceMode: "" | "upload" | "update" = shownStatus === INVOICE_UPLOAD_STATUS ? "upload" : INVOICE_UPDATE_STATUSES.includes(shownStatus) ? "update" : "";
  const courierOf = (id: number) => inv[id]?.courier ?? defaultCourier;
  const setInvoice = (id: number, patch: Partial<{ courier: string; invoice: string }>) =>
    setInv((cur) => ({ ...cur, [id]: { courier: cur[id]?.courier ?? defaultCourier, invoice: cur[id]?.invoice ?? "", ...patch } }));
  const filled = orders.filter((o) => (inv[o.shipmentBoxId]?.invoice ?? "").trim());

  // 엑셀에서 복사한 「주문번호(또는 배송번호) 송장번호」를 불러온 목록에 채운다
  const applyPaste = () => {
    const rows = parseInvoicePaste(paste);
    let hit = 0;
    const nextInv = { ...inv };
    for (const row of rows) {
      const o = orders.find((x) => x.orderId === row.key || x.shipmentBoxId === row.key);
      if (!o) continue;
      nextInv[o.shipmentBoxId] = { courier: nextInv[o.shipmentBoxId]?.courier ?? defaultCourier, invoice: row.invoice };
      hit++;
    }
    setInv(nextInv);
    setAckNote(`📋 붙여 넣은 ${rows.length}줄 중 ${hit}건을 목록의 주문에 채웠습니다.${rows.length > hit ? " 나머지는 지금 목록에 없는 주문번호입니다." : ""}`);
  };

  // 송장 등록(상품준비중 → 배송지시) / 수정. 확인을 한 번 더 받고, 실패해도 다시 보내지 않는다
  const sendInvoices = () =>
    invoiceMode &&
    start(async () => {
      setAsking("");
      const entries = filled.map((o) => ({ shipmentBoxId: o.shipmentBoxId, orderId: o.orderId, courier: courierOf(o.shipmentBoxId), invoice: inv[o.shipmentBoxId].invoice, vendorItemIds: o.items.map((it) => it.vendorItemId) }));
      // 쿠팡은 한 번에 50건까지라 나눠 보낸다. 한 묶음이 실패하면 그 뒤는 보내지 않는다
      const results: AckResult[] = [];
      let stopped = "";
      for (const part of chunk(entries, ACK_MAX)) {
        const r = await submitInvoicesAction(invoiceMode, part);
        if (!r.ok) { stopped = r.error; break; }
        results.push(...r.results);
      }
      setAckResults(results);
      const okCount = results.filter((x) => x.ok).length;
      setAckNote(stopped ? `❌ ${stopped}${okCount ? ` (앞서 ${okCount}건은 처리됐습니다.)` : ""}` : `✅ ${results.length}건 중 ${okCount}건을 처리했습니다.`);
      const done = new Set(results.filter((x) => x.ok).map((x) => x.shipmentBoxId));
      if (invoiceMode === "upload") setOrders(orders.filter((o) => !done.has(o.shipmentBoxId)));
      else
        setOrders(orders.map((o) => (done.has(o.shipmentBoxId) ? { ...o, invoiceNumber: inv[o.shipmentBoxId].invoice.replace(/[\s-]/g, ""), deliveryCompanyName: COMMON_COURIERS.find((c) => c.code === courierOf(o.shipmentBoxId))?.name ?? courierOf(o.shipmentBoxId) } : o)));
      setInv((cur) => Object.fromEntries(Object.entries(cur).filter(([k]) => !done.has(Number(k)))));
    });

  // 판매자 주문 취소(배송 묶음 하나씩). 결제완료 = 즉시 취소, 상품준비중 = 출고중지. 판매자 점수가 낮아진다(명세)
  const canCancel = shownStatus === "ACCEPT" || shownStatus === "INSTRUCT";
  const cancelOrder = () =>
    cancelling &&
    start(async () => {
      const o = orders.find((x) => x.shipmentBoxId === cancelling.box);
      const reason = cancelling.reason;
      setCancelling(null);
      if (!o) return;
      const r = await cancelOrderAction(o.orderId, reason, o.items.map((it) => ({ vendorItemId: it.vendorItemId, count: it.qty })));
      setAckNote(r.ok ? `✅ 주문번호 ${o.orderId}: ${r.message}` : `❌ 주문번호 ${o.orderId}: ${r.error}`);
      if (r.ok) setOrders(orders.filter((x) => x.shipmentBoxId !== o.shipmentBoxId));
    });

  // R1: 발주서 파일은 브라우저에서만 만든다. 고객 정보가 있어 서버에 올리거나 저장하지 않는다
  const downloadFile = (list: OrderSheet[]) => {
    const today = kstDay(0);
    saveWorkbook(`쿠팡_발주서_${today}_${list.length}건.xlsx`, "발주서", orderFileRows(list, defaultCourier));
  };
  const uploadInvoiceFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const r = matchInvoiceFile(readSheet(new Uint8Array(await file.arrayBuffer()), file.name), orders);
      setInv((cur) => ({ ...cur, ...Object.fromEntries(r.fills.map((f) => [f.shipmentBoxId, { courier: f.courier || cur[f.shipmentBoxId]?.courier || defaultCourier, invoice: f.invoice }])) }));
      setAckNote(`📄 파일에서 ${r.fills.length}건을 채웠습니다.${r.unmatched ? ` 목록에 없거나 어느 묶음인지 알 수 없는 줄 ${r.unmatched}건은 건너뛰었습니다.` : ""}${r.noInvoice ? ` 송장이 빈 줄 ${r.noInvoice}건.` : ""}${r.badKey ? ` ⚠ 번호가 2.2E+13처럼 바뀐 줄 ${r.badKey}건은 건너뛰었습니다. 받은 파일의 번호 칸을 그대로 두고 저장해 주세요.` : ""} 내용을 확인한 뒤 등록을 눌러 주세요.`);
    } catch {
      setAckNote("❌ 파일을 읽지 못했습니다. 엑셀(.xlsx)이나 CSV 파일인지 확인해 주세요.");
    }
  };

  const toggle = (id: number) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : picked.length >= ACK_MAX ? picked : [...picked, id]);

  // 결제완료 → 상품준비중. 실제 주문 상태가 바뀌므로 확인을 한 번 더 받고, 실패해도 다시 보내지 않는다
  const acknowledge = (withFile = false) =>
    start(async () => {
      setAsking("");
      const r = await acknowledgeOrdersAction(picked, { from, to });
      if (!r.ok) return setAckNote(`❌ ${r.error}`);
      setAckResults(r.results);
      const done = new Set(r.results.filter((x) => x.ok).map((x) => x.shipmentBoxId));
      setPicked([]);
      if (!r.preparing) {
        setAckNote(`✅ ${r.summary} 처리 뒤 고객이 배송지를 바꿨을 수 있으니 「상품준비중」으로 다시 불러와 주소를 확인해 주세요.`);
        setOrders(orders.filter((o) => !done.has(o.shipmentBoxId)));
        return;
      }
      // A2: 바로 상품준비중 목록으로 넘어가 송장을 넣는다. A4: 처리 전 주소와 다르면 표시
      const before = new Map(orders.map((o) => [o.shipmentBoxId, `${o.postCode} ${o.address} ${o.receiverName}`]));
      const changed = r.preparing.filter((o) => before.has(o.shipmentBoxId) && before.get(o.shipmentBoxId) !== `${o.postCode} ${o.address} ${o.receiverName}`).map((o) => o.shipmentBoxId);
      // R2: 방금 처리한 건만 파일로 받는다(이미 택배를 접수했을 수 있는 앞선 건이 다시 나가지 않게). 다시 읽은 주소가 들어간다
      if (withFile) {
        const fresh = r.preparing.filter((o) => done.has(o.shipmentBoxId));
        if (fresh.length) downloadFile(fresh);
      }
      setOrders(r.preparing);
      setNext("");
      setStatus("INSTRUCT");
      setShownStatus("INSTRUCT");
      setMoved(changed);
      setAckNote(`✅ ${r.summary} 이어서 송장을 넣을 수 있게 「상품준비중」 목록으로 넘어왔습니다.${changed.length ? ` ⚠ 배송지가 바뀐 주문 ${changed.length}건이 있습니다(빨간 표시).` : " 배송지가 바뀐 주문은 없습니다."}`);
    });

  useEffect(() => {
    if (autoLoad && keysSaved) load(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="slw-card space-y-4 p-5">
      {!keysSaved && <p className="text-xs text-amber-800">먼저 「API키등록·플랫폼연동」에서 키를 저장해 주세요.</p>}
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-bold text-slate-700">
          주문 상태
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={`mt-1 block ${input}`}>
            {ORDER_STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </label>
        <label className="text-xs font-bold text-slate-700">
          시작일
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={`mt-1 block ${input}`} />
        </label>
        <label className="text-xs font-bold text-slate-700">
          종료일
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={`mt-1 block ${input}`} />
        </label>
        <button type="button" disabled={!keysSaved || pending} onClick={() => load(false)} className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-bold text-white hover:bg-blue-800 disabled:opacity-50">
          {pending ? "불러오는 중…" : "발주서 불러오기"}
        </button>
      </div>
      {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-[13px] text-rose-900">❌ {error}</p>}
      {loaded && !error && orders.length === 0 && <p className="text-sm text-slate-600">이 기간에 「{orderStatusLabel(status)}」 상태인 주문이 없습니다.</p>}
      {orders.length > 0 && <p className="text-xs text-slate-500">배송 묶음 {orders.length}건{next ? " (더 있음)" : ""}</p>}
      {canAck && orders.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
          <span>보낼 준비를 시작할 주문을 고르세요(한 번에 {ACK_MAX}건까지). 처리하면 쿠팡 주문 상태가 「상품준비중」으로 바뀝니다.</span>
          <button type="button" onClick={() => setPicked(picked.length ? [] : orders.slice(0, ACK_MAX).map((o) => o.shipmentBoxId))} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">{picked.length ? "선택 해제" : "모두 고르기"}</button>
          <button type="button" disabled={pending || picked.length === 0} onClick={() => setAsking("ack")} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 disabled:opacity-50">선택한 {picked.length}건 상품준비중으로</button>
          <button type="button" disabled={pending} onClick={() => { if (!picked.length) setPicked(orders.slice(0, ACK_MAX).map((o) => o.shipmentBoxId)); setAsking("ackFile"); }} className="rounded border border-blue-600 bg-blue-700 px-3 py-1 text-[12px] font-bold text-white disabled:opacity-50">⚡ {picked.length || Math.min(orders.length, ACK_MAX)}건 처리하고 발주서 파일 받기</button>
        </div>
      )}
      {invoiceMode && orders.length > 0 && (
        <div className="space-y-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-[12px] text-teal-900">
          <p>
            {invoiceMode === "upload" ? "주문마다 택배사·송장번호를 넣고 등록하면 쿠팡 주문이 「배송지시」로 바뀝니다." : "잘못 넣은 송장만 새 번호로 고칩니다(고치면 배송지시로 다시 바뀌고, 이후 택배 추적에 따라 바뀝니다)."} 한 배송 묶음에 송장 하나로 보냅니다(분리배송은 WING에서).
            {!defaultCourier && " 「⚙ 배송·반품 기본값」에 택배사를 저장해 두면 자동으로 골라집니다."}
          </p>
          {invoiceMode === "upload" && (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => downloadFile(orders)} className="rounded border border-teal-600 bg-white px-2 py-1 text-[11px] font-bold text-teal-800">📥 발주서 파일 받기({orders.length}건{next ? ", 더 보기 전" : ""})</button>
              <label className="cursor-pointer rounded border border-teal-600 bg-white px-2 py-1 text-[11px] font-bold text-teal-800">
                📤 송장 파일 올리기
                <input type="file" accept={ACCEPT_SHEETS} className="hidden" onChange={(e) => { uploadInvoiceFile(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              <span className="text-[11px]">파일을 택배사에 올리고, 송장이 채워진 파일을 다시 올리면 됩니다. 파일에는 고객 정보가 있으니 다 쓴 뒤 지워 주세요.</span>
            </div>
          )}
          <details>
            <summary className="cursor-pointer font-bold">📋 엑셀에서 한 번에 붙여넣기</summary>
            <p className="mt-1 text-[11px]">엑셀에서 「주문번호(또는 배송번호)」와 「송장번호」 두 칸을 함께 복사해 붙여 넣으세요. 머리글 줄은 건너뜁니다.</p>
            <textarea value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} placeholder={"2000123456\t123456789012\n2000123457\t123456789013"} className="mt-1 w-full rounded border border-slate-300 bg-white p-2 font-mono text-[12px]" />
            <button type="button" disabled={!paste.trim()} onClick={applyPaste} className="mt-1 rounded border border-teal-600 bg-white px-2 py-1 text-[11px] font-bold text-teal-800 disabled:opacity-50">목록에 채우기</button>
          </details>
          <button type="button" disabled={pending || filled.length === 0} onClick={() => setAsking("invoice")} className="rounded border border-blue-600 bg-blue-700 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50">
            송장 넣은 {filled.length}건 {invoiceMode === "upload" ? "등록" : "수정"}
          </button>
        </div>
      )}
      {asking === "invoice" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-900">
          <span className="font-bold">주문 {filled.length}건의 송장을 쿠팡에 {invoiceMode === "upload" ? "등록할까요? 등록하면 「배송지시」로 바뀌고, 잘못된 송장으로 생긴 배송비는 판매자 부담입니다." : "고칠까요?"}</span>
          <button type="button" disabled={pending} onClick={sendInvoices} className="rounded border border-blue-600 bg-blue-700 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50">{pending ? "보내는 중…" : "네, 쿠팡에 적용"}</button>
          <button type="button" disabled={pending} onClick={() => setAsking("")} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">취소</button>
        </div>
      )}
      {asking === "ackFile" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-900">
          <span className="font-bold">주문 {picked.length}건을 「상품준비중」으로 바꾸고, 다시 읽은 배송지로 발주서 파일을 받을까요? 상태는 되돌릴 수 없습니다.</span>
          <button type="button" disabled={pending} onClick={() => acknowledge(true)} className="rounded border border-blue-600 bg-blue-700 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50">{pending ? "처리하는 중…" : "네, 쿠팡에 적용"}</button>
          <button type="button" disabled={pending} onClick={() => setAsking("")} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">취소</button>
        </div>
      )}
      {asking === "ack" && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-[12px] text-rose-900">
          <span className="font-bold">주문 {picked.length}건을 쿠팡에서 「상품준비중」으로 바꿀까요? 되돌릴 수 없습니다.</span>
          <button type="button" disabled={pending} onClick={() => acknowledge()} className="rounded border border-blue-600 bg-blue-700 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50">{pending ? "바꾸는 중…" : "네, 쿠팡에 적용"}</button>
          <button type="button" disabled={pending} onClick={() => setAsking("")} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">취소</button>
        </div>
      )}
      {ackNote && <p className="text-[12px] text-slate-800">{ackNote}</p>}
      {ackResults.some((x) => !x.ok) && (
        <ul className="rounded-lg bg-rose-50 px-3 py-2 text-[12px] text-rose-900">
          {ackResults.filter((x) => !x.ok).map((x) => <li key={x.shipmentBoxId}>배송번호 {x.shipmentBoxId}: {x.message}{x.retryable ? " (잠시 뒤 다시 시도할 수 있습니다)" : ""}</li>)}
        </ul>
      )}
      <ul className="space-y-2">
        {orders.map((o) => (
          <li key={o.shipmentBoxId} className={`rounded-lg border p-3 text-[13px] ${moved.includes(o.shipmentBoxId) ? "border-blue-400 bg-blue-50" : "border-slate-200"}`}>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {canAck && <input type="checkbox" aria-label={`배송번호 ${o.shipmentBoxId} 고르기`} checked={picked.includes(o.shipmentBoxId)} onChange={() => toggle(o.shipmentBoxId)} className="h-4 w-4 accent-blue-700" />}
              <span className="rounded bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">{orderStatusLabel(o.status)}</span>
              <span className="font-bold text-slate-900">주문번호 {o.orderId}</span>
              <span className="text-xs text-slate-500">배송번호 {o.shipmentBoxId} · 주문 {o.orderedAt.replace("T", " ").slice(0, 16)}</span>
              {o.invoiceNumber && <span className="text-xs text-teal-700">🚚 {o.deliveryCompanyName} {o.invoiceNumber}</span>}
            </div>
            <ul className="mt-2 space-y-0.5">
              {o.items.map((it, i) => (
                <li key={`${it.vendorItemId}-${i}`} className="text-slate-800">
                  · {it.name}{it.optionName && it.optionName !== it.name ? ` (${it.optionName})` : ""} — <b>{it.qty}개</b>
                  {it.cancelQty > 0 && <span className="text-rose-700"> (취소·환불대기 {it.cancelQty}개)</span>} · {it.orderPrice.toLocaleString()}원
                  {it.estimatedShippingDate && <span className="text-xs text-slate-500"> · 출고예정 {it.estimatedShippingDate}</span>}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-600">
              {moved.includes(o.shipmentBoxId) && <b className="text-rose-700">⚠ 배송지 바뀜 — 아래 주소로 보내세요 · </b>}
              📦 {o.receiverName} · {o.receiverSafeNumber} · ({o.postCode}) {o.address}
              {o.shippingPrice > 0 && ` · 배송비 ${o.shippingPrice.toLocaleString()}원`}
            </p>
            {o.message && <p className="text-xs text-slate-500">💬 {o.message}</p>}
            {canCancel && (
              <div className="mt-2">
                {cancelling?.box === o.shipmentBoxId ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-rose-300 bg-rose-50 px-2 py-1.5 text-[12px] text-rose-900">
                    <select aria-label={`주문번호 ${o.orderId} 취소 사유`} value={cancelling.reason} onChange={(e) => setCancelling({ box: o.shipmentBoxId, reason: e.target.value })} className="rounded border border-slate-300 bg-white px-2 py-1 text-[12px]">
                      <option value="">취소 사유 고르기</option>
                      {CANCEL_REASONS.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
                    </select>
                    <span>{shownStatus === "ACCEPT" ? "결제완료 주문은 바로 취소됩니다." : "상품준비중 주문은 출고중지로 취소됩니다."} 판매자 취소는 판매자 점수(주문이행)를 낮춥니다.</span>
                    <button type="button" disabled={pending || !cancelling.reason} onClick={cancelOrder} className="rounded border border-blue-600 bg-blue-700 px-2 py-1 text-[11px] font-bold text-white disabled:opacity-50">{pending ? "취소하는 중…" : "네, 쿠팡에서 취소"}</button>
                    <button type="button" disabled={pending} onClick={() => setCancelling(null)} className="rounded border border-slate-300 bg-white px-2 py-1 text-[11px] font-bold text-slate-700">닫기</button>
                  </div>
                ) : (
                  <button type="button" disabled={pending} onClick={() => setCancelling({ box: o.shipmentBoxId, reason: "" })} className="rounded border border-slate-300 bg-white px-2 py-0.5 text-[11px] font-bold text-slate-600 hover:border-blue-300 hover:text-blue-700">
                    주문 취소…
                  </button>
                )}
              </div>
            )}
            {invoiceMode && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select aria-label={`배송번호 ${o.shipmentBoxId} 택배사`} value={courierOf(o.shipmentBoxId)} onChange={(e) => setInvoice(o.shipmentBoxId, { courier: e.target.value })} className="rounded border border-slate-300 bg-white px-2 py-1 text-[12px]">
                  {!courierOf(o.shipmentBoxId) && <option value="">택배사 고르기</option>}
                  {COMMON_COURIERS.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
                  {courierOf(o.shipmentBoxId) && !COMMON_COURIERS.some((c) => c.code === courierOf(o.shipmentBoxId)) && <option value={courierOf(o.shipmentBoxId)}>{courierOf(o.shipmentBoxId)}</option>}
                </select>
                <input aria-label={`배송번호 ${o.shipmentBoxId} 송장번호`} placeholder={invoiceMode === "upload" ? "송장번호" : "새 송장번호"} value={inv[o.shipmentBoxId]?.invoice ?? ""} onChange={(e) => setInvoice(o.shipmentBoxId, { invoice: e.target.value })} className="w-44 rounded border border-slate-300 bg-white px-2 py-1 text-[12px]" />
              </div>
            )}
          </li>
        ))}
      </ul>
      {next && (
        <button type="button" disabled={pending} onClick={() => load(true)} className="w-full rounded-lg border border-slate-300 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
          {pending ? "불러오는 중…" : "더 보기"}
        </button>
      )}
    </section>
  );
}
