"use client";
// ✏️ 볼타 수정발행 입력 카드(2026-11-15, 플랜 docs/PLAN_20261115_BOLTA_AMEND.md). 명령: btAmend(src/server/bolta.ts).
// 국세청에 나간 세금계산서는 지울 수 없어 「발급 취소」도 여기의 「계약의 해제」·「착오에 의한 이중발급」이다.
import { useMemo, useState } from "react";
import { useReceiptRpc } from "./receiptRpc"; // 2026-11-17 WS-20261117-17: 보드가 내려 준 화면 기대 계정 rpc

type Reason = "termination" | "doubleIssuance" | "changeSupplyCost" | "return" | "misspell";
interface Biz { bizNo: string; name: string; ceo: string; address: string; bizType: string; bizItem: string; email: string; phone: string }
interface Line { name: string; spec: string; qty: number; unitPrice: number; supply?: number; tax?: number }
// 입력칸은 친 글자를 그대로 들고 있다가 계산·보낼 때만 숫자로(2026-11-15 운영 확인: 숫자로 바로 바꾸면 「-」 한 글자가 0이 되어 마이너스를 칠 수 없었음)
interface DiffRow { name: string; qty: string; unitPrice: string }
interface FixRow { name: string; spec: string; qty: string; unitPrice: string }
const toNum = (v: string) => { const n = Number(String(v).replace(/[^\d.-]/g, "")); return Number.isFinite(n) ? n : 0; };
const clean = (v: string) => v.replace(/[^\d.-]/g, "");
export interface AmendDoc { id: string; date: string; partner: Biz; lines: Line[]; supply: number; tax: number; total: number; taxMode: "separate" | "included" | "none"; purpose: string; bolta?: { mode: "test" | "live" } }

const REASONS: { id: Reason; label: string; desc: string }[] = [
  { id: "termination", label: "계약의 해제", desc: "계약이 취소됐을 때 — 원본 전체를 마이너스로 상계합니다(발급 취소)." },
  { id: "doubleIssuance", label: "착오에 의한 이중발급", desc: "같은 건을 두 번 발급했을 때 — 원본 전체를 마이너스로 상계합니다. 작성일자는 원본 날짜." },
  { id: "changeSupplyCost", label: "공급가액 변동", desc: "금액이 바뀌었을 때 — 늘어난(+) 또는 줄어든(-) 차이만 품목으로 적습니다." },
  { id: "return", label: "환입(반품)", desc: "물건이 반품됐을 때 — 돌려받은 금액을 마이너스 품목으로 적습니다." },
  { id: "misspell", label: "기재사항 착오정정", desc: "적은 내용이 틀렸을 때 — 고친 내용으로 취소분·수정분 두 장을 발행합니다(포인트 2장)." },
];
const won = (n: number) => `${(Number(n) || 0).toLocaleString("ko-KR")}원`;
const today = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);
// 서버와 같은 계산: 세액 = 공급가액 10% 내림(마이너스는 절댓값을 내림), 면세는 0
const tenth = (s: number) => Math.sign(s) * Math.floor(Math.abs(s) * 0.1);
const calcLine = (qty: number, unitPrice: number, mode: AmendDoc["taxMode"]) => {
  const amount = Math.round((Number(qty) || 0) * (Number(unitPrice) || 0));
  if (mode === "none") return { supply: amount, tax: 0 };
  if (mode === "included") { const supply = Math.round(amount / 1.1); return { supply, tax: amount - supply }; }
  return { supply: amount, tax: Math.floor(amount * 0.1) };
};

export function AmendPanel({ doc, notify, onDone, onClose }: { doc: AmendDoc; notify: (n: { text: string; error?: boolean }) => void; onDone: () => void; onClose: () => void }) {
  const rpc = useReceiptRpc(); // 2026-11-17 WS-20261117-17: 화면 기대 계정이 실린 요청
  const live = doc.bolta?.mode === "live";
  const taxFree = doc.taxMode === "none";
  const [reason, setReason] = useState<Reason>("termination");
  const [date, setDate] = useState(today());
  const [diff, setDiff] = useState<DiffRow[]>([{ name: doc.lines[0]?.name ?? "", qty: "1", unitPrice: "" }]);
  const [fixed, setFixed] = useState<{ partner: Biz; lines: FixRow[]; purpose: string; date: string }>(() => ({ partner: { ...doc.partner }, lines: doc.lines.map((l) => ({ name: l.name, spec: l.spec, qty: String(l.qty ?? ""), unitPrice: String(l.unitPrice ?? "") })), purpose: doc.purpose || "영수", date: doc.date }));
  const [busy, setBusy] = useState(false);

  // 화면 미리보기(서버가 같은 규칙으로 다시 계산해 보냄)
  const preview = useMemo(() => {
    if (reason === "termination" || reason === "doubleIssuance") return { amount: -doc.total, rows: [] as { name: string; supply: number; tax: number }[] };
    if (reason === "misspell") {
      const rows = fixed.lines.map((l) => ({ name: l.name, ...calcLine(toNum(l.qty), toNum(l.unitPrice), doc.taxMode) }));
      return { amount: rows.reduce((s, r) => s + r.supply + r.tax, 0) - doc.total, rows };
    }
    const rows = diff.map((l) => { const supply = Math.round(toNum(l.qty) * toNum(l.unitPrice)); return { name: l.name, supply, tax: taxFree ? 0 : tenth(supply) }; });
    return { amount: rows.reduce((s, r) => s + r.supply + r.tax, 0), rows };
  }, [reason, diff, fixed, doc, taxFree]);

  const send = async () => {
    const r = REASONS.find((x) => x.id === reason)!;
    const sheets = reason === "misspell" ? 2 : 1;
    const warn = live
      ? `⚠️ 실제(live_) 키입니다. 국세청으로 실제 발행되며 되돌릴 수 없고, 볼타 포인트가 ${sheets}장 차감됩니다.`
      : "테스트(test_) 키입니다. 국세청 전송·포인트 차감이 없습니다.";
    if (!window.confirm(`「${r.label}」 수정세금계산서를 발행합니다(바뀌는 금액 ${won(preview.amount)}).\n${warn}\n계속할까요?`)) return;
    setBusy(true);
    try {
      const body: Record<string, unknown> = { id: doc.id, reason };
      if (reason === "termination") body.date = date;
      if (reason === "changeSupplyCost" || reason === "return") {
        body.date = date;
        body.lines = diff.map((l) => ({ name: l.name, qty: toNum(l.qty) || undefined, unitPrice: toNum(l.unitPrice), supply: Math.round(toNum(l.qty) * toNum(l.unitPrice)) }));
      }
      if (reason === "misspell") body.doc = { date: fixed.date, partner: fixed.partner, lines: fixed.lines.map((l) => ({ name: l.name, spec: l.spec, qty: toNum(l.qty), unitPrice: toNum(l.unitPrice) })), purpose: fixed.purpose, taxMode: doc.taxMode };
      const res = await rpc<{ state: string; ntsTransactionId?: string | null; cancelNts?: string | null; message?: string }>("btAmend", body);
      const kind = live ? "실제" : "테스트";
      notify({ text: res.state === "issued" ? `${kind} 수정발행 완료${res.ntsTransactionId ? ` · 승인번호 ${res.ntsTransactionId}` : ""}${res.cancelNts ? ` · 취소분 ${res.cancelNts}` : ""}` : `${kind} 수정발행이 접수됐습니다. ${res.message ?? ""}` });
      onDone();
      onClose();
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
      onDone();
    } finally {
      setBusy(false);
    }
  };

  const setDiffLine = (i: number, p: Partial<DiffRow>) => setDiff((ls) => ls.map((l, j) => (j === i ? { ...l, ...p } : l)));
  const setFixedLine = (i: number, p: Partial<FixRow>) => setFixed((f) => ({ ...f, lines: f.lines.map((l, j) => (j === i ? { ...l, ...p } : l)) }));

  return (
    <div className="rc-card rc-amend">
      <div className="rc-card-head">
        <b>✏️ 수정발행 — {doc.date} {doc.partner?.name} ({won(doc.total)})</b>
        <span className={`rc-chip${live ? " live" : ""}`}>{live ? "🔴 실제 키" : "🧪 테스트 키"}</span>
      </div>
      <p className="rc-hint">국세청에 나간 세금계산서는 지울 수 없어서, 고치거나 취소할 때는 사유에 맞는 수정세금계산서를 새로 발행합니다.</p>
      <div className="rc-amend-reasons" role="radiogroup" aria-label="수정 사유">
        {REASONS.map((r) => (
          <label key={r.id} className={`rc-amend-reason${reason === r.id ? " on" : ""}`}>
            <input type="radio" name={`amend-${doc.id}`} checked={reason === r.id} onChange={() => setReason(r.id)} />
            <span><b>{r.label}</b><small>{r.desc}</small></span>
          </label>
        ))}
      </div>

      {(reason === "termination" || reason === "changeSupplyCost" || reason === "return") && (
        <label className="rc-amend-date">{reason === "termination" ? "계약 해제일(작성일자)" : reason === "return" ? "환입일" : "변동일(작성일자)"}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      )}

      {(reason === "changeSupplyCost" || reason === "return") && (
        <>
          <p className="rc-hint">{reason === "return" ? "돌려받은 만큼 단가를 마이너스로 적어 주세요(예: 4개 × -5,000원)." : "바뀐 만큼만 적어 주세요. 줄었으면 단가를 마이너스로(예: 10개 × -1,000원)."}{taxFree ? " 면세 세금계산서라 세액은 없습니다." : " 세액은 공급가액의 10%로 자동 계산합니다."}</p>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead><tr><th>품목</th><th className="num">수량</th><th className="num">단가</th><th className="num">공급가액</th><th className="num">세액</th><th></th></tr></thead>
              <tbody>
                {diff.map((l, i) => (
                  <tr key={i}>
                    <td><input value={l.name} onChange={(e) => setDiffLine(i, { name: e.target.value })} aria-label="품목" /></td>
                    <td className="num"><input inputMode="decimal" value={l.qty} onChange={(e) => setDiffLine(i, { qty: clean(e.target.value) })} aria-label="수량" /></td>
                    <td className="num"><input inputMode="numeric" value={l.unitPrice} onChange={(e) => setDiffLine(i, { unitPrice: clean(e.target.value) })} aria-label="단가" /></td>
                    <td className="num">{won(preview.rows[i]?.supply ?? 0)}</td><td className="num">{won(preview.rows[i]?.tax ?? 0)}</td>
                    <td><button type="button" className="rc-x" onClick={() => setDiff((ls) => ls.filter((_, j) => j !== i))} aria-label="줄 지우기">✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="rc-row-btns"><button type="button" className="rc-btn ghost" onClick={() => setDiff((ls) => [...ls, { name: "", qty: "1", unitPrice: "" }])}>＋ 품목 추가</button></div>
        </>
      )}

      {reason === "misspell" && (
        <>
          <p className="rc-hint">틀린 칸만 고쳐 주세요. 원본을 마이너스로 상계하는 취소분과 고친 내용의 수정분, 두 장이 함께 발행됩니다. 과세↔면세는 바꿀 수 없습니다.</p>
          <div className="rc-grid">
            <label>작성일자<input type="date" value={fixed.date} onChange={(e) => setFixed((f) => ({ ...f, date: e.target.value }))} /></label>
            <label>영수/청구<select value={fixed.purpose} onChange={(e) => setFixed((f) => ({ ...f, purpose: e.target.value }))}><option>영수</option><option>청구</option></select></label>
            <label>거래처 상호<input value={fixed.partner.name} onChange={(e) => setFixed((f) => ({ ...f, partner: { ...f.partner, name: e.target.value } }))} /></label>
            <label>대표자<input value={fixed.partner.ceo} onChange={(e) => setFixed((f) => ({ ...f, partner: { ...f.partner, ceo: e.target.value } }))} /></label>
            <label>등록번호<input value={fixed.partner.bizNo} onChange={(e) => setFixed((f) => ({ ...f, partner: { ...f.partner, bizNo: e.target.value } }))} /></label>
            <label>이메일<input value={fixed.partner.email} onChange={(e) => setFixed((f) => ({ ...f, partner: { ...f.partner, email: e.target.value } }))} /></label>
            <label className="wide">주소<input value={fixed.partner.address} onChange={(e) => setFixed((f) => ({ ...f, partner: { ...f.partner, address: e.target.value } }))} /></label>
          </div>
          <div className="rc-table-wrap">
            <table className="rc-table">
              <thead><tr><th>품목</th><th>규격</th><th className="num">수량</th><th className="num">단가</th><th className="num">공급가액</th><th className="num">세액</th></tr></thead>
              <tbody>
                {fixed.lines.map((l, i) => (
                  <tr key={i}>
                    <td><input value={l.name} onChange={(e) => setFixedLine(i, { name: e.target.value })} aria-label="품목" /></td>
                    <td><input value={l.spec} onChange={(e) => setFixedLine(i, { spec: e.target.value })} aria-label="규격" /></td>
                    <td className="num"><input inputMode="decimal" value={l.qty} onChange={(e) => setFixedLine(i, { qty: clean(e.target.value) })} aria-label="수량" /></td>
                    <td className="num"><input inputMode="numeric" value={l.unitPrice} onChange={(e) => setFixedLine(i, { unitPrice: clean(e.target.value) })} aria-label="단가" /></td>
                    <td className="num">{won(preview.rows[i]?.supply ?? 0)}</td><td className="num">{won(preview.rows[i]?.tax ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <div className="rc-sum">
        <div><span>원본 합계</span><b>{won(doc.total)}</b></div>
        <div><span>이번에 바뀌는 금액</span><b className={preview.amount < 0 ? "neg" : ""}>{won(preview.amount)}</b></div>
        <div><span>고친 뒤 합계</span><b>{won(doc.total + preview.amount)}</b></div>
      </div>
      <div className="rc-row-btns">
        <button type="button" className="rc-btn" disabled={busy} onClick={() => void send()}>{busy ? "보내는 중…" : live ? "🔴 실제 수정발행 보내기" : "🧪 테스트 수정발행 보내기"}</button>
        <button type="button" className="rc-btn ghost" disabled={busy} onClick={onClose}>닫기</button>
      </div>
    </div>
  );
}
