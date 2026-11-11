"use client";
// 🧾 영수증·세금계산서 화면(2026-11-11). 명령: /api/rpc/rcpt*(src/server/receipts.ts). 플랜 docs/PLAN_20261027_RECEIPT_TAX_INVOICE.md §6
import { useCallback, useEffect, useMemo, useState } from "react";

type EvidenceKind = "receipt" | "tax_invoice" | "cash_receipt" | "card" | "other";
const EVIDENCE_KINDS: Record<EvidenceKind, string> = { receipt: "영수증", tax_invoice: "세금계산서", cash_receipt: "현금영수증", card: "카드전표", other: "기타" };
type DocKind = "receipt" | "statement" | "tax_invoice";
const DOC_KINDS: Record<DocKind, string> = { receipt: "간이영수증", statement: "거래명세서", tax_invoice: "세금계산서" };
type TaxMode = "separate" | "included" | "none";

interface Biz { id?: string; bizNo: string; name: string; ceo: string; address: string; bizType: string; bizItem: string; email: string; phone: string }
interface Item { id?: string; name: string; spec: string; unitPrice: number }
interface Evidence { id?: string; kind: EvidenceKind; date: string; vendor: string; bizNo: string; supply: number; vat: number; total: number; payment: string; memo: string }
interface Line { name: string; spec: string; qty: number; unitPrice: number; supply?: number; tax?: number }
interface Doc { id: string; kind: DocKind; date: string; partner: Biz; lines: (Line & { supply: number; tax: number })[]; supply: number; tax: number; total: number; taxMode: TaxMode; purpose: string; memo: string; createdTime: number }
interface State { profile: Biz | null; partners: Biz[]; items: Item[]; docs: Doc[]; month: string; evidence: Evidence[]; summary: { count: number; supply: number; vat: number; total: number }; retentionDays: number }
interface Pending { key: string; name: string; status: "reading" | "ready" | "error"; error?: string; ev?: Evidence }

const EMPTY_BIZ: Biz = { bizNo: "", name: "", ceo: "", address: "", bizType: "", bizItem: "", email: "", phone: "" };
const won = (n: number) => `${(Number(n) || 0).toLocaleString("ko-KR")}원`;
const today = () => new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10);

async function rpc<T>(name: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`/api/rpc/${name}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json as { message?: string }).message || "요청을 처리하지 못했습니다.");
  return json as T;
}

/** 사진을 긴 변 1600px JPEG로 줄여 dataURL로(올리는 크기·AI 비용 절약) */
async function shrinkPhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((ok, bad) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => bad(new Error("사진을 열지 못했습니다."));
      i.src = url;
    });
    const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
    const c = document.createElement("canvas");
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function calc(qty: number, unitPrice: number, mode: TaxMode) {
  const amount = Math.round((Number(qty) || 0) * (Number(unitPrice) || 0));
  if (mode === "none") return { supply: amount, tax: 0 };
  if (mode === "included") {
    const supply = Math.round(amount / 1.1);
    return { supply, tax: amount - supply };
  }
  return { supply: amount, tax: Math.floor(amount * 0.1) };
}

export function ReceiptsBoard() {
  const [tab, setTab] = useState<"evidence" | "issue" | "info">("evidence");
  const [state, setState] = useState<State | null>(null);
  const [month, setMonth] = useState(today().slice(0, 7));
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const [printDoc, setPrintDoc] = useState<Doc | null>(null);

  const load = useCallback(async (m = month) => {
    try {
      setState(await rpc<State>("rcptState", { month: m }));
    } catch (e) {
      setNotice({ text: (e as Error).message, error: true });
    }
  }, [month]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!printDoc) return;
    const t = setTimeout(() => window.print(), 150);
    const after = () => setPrintDoc(null);
    window.addEventListener("afterprint", after);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", after); };
  }, [printDoc]);

  if (!state) return <div className="aww-inbox-empty">불러오는 중…</div>;
  return (
    <div className="rc">
      {notice && (
        <div className={`aww-inbox-notice rc-noprint ${notice.error ? "error" : ""}`} role="status">
          <span>{notice.text}</span>
          <button type="button" className="rc-x" onClick={() => setNotice(null)} aria-label="닫기">✕</button>
        </div>
      )}
      <div className="rc-tabs rc-noprint" role="tablist">
        {([["evidence", "📷 증빙 정리"], ["issue", "✍️ 발행"], ["info", "🏢 내 사업자·거래처·품목"]] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} className={`rc-tab ${tab === id ? "on" : ""}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div className="rc-noprint">
        {tab === "evidence" && <EvidenceTab state={state} month={month} setMonth={(m) => { setMonth(m); void load(m); }} reload={() => load()} notify={setNotice} />}
        {tab === "issue" && <IssueTab state={state} reload={() => load()} notify={setNotice} print={setPrintDoc} goInfo={() => setTab("info")} />}
        {tab === "info" && <InfoTab state={state} reload={() => load()} notify={setNotice} />}
      </div>
      {printDoc && <PrintView doc={printDoc} me={state.profile ?? EMPTY_BIZ} />}
    </div>
  );
}

// ---------------------------------------------------------------- 📷 증빙 정리
function EvidenceTab({ state, month, setMonth, reload, notify }: { state: State; month: string; setMonth: (m: string) => void; reload: () => void; notify: (n: { text: string; error?: boolean }) => void }) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [manual, setManual] = useState(false);

  const onFiles = async (files: FileList | null) => {
    const list = Array.from(files ?? []).slice(0, 10);
    if (!list.length) return;
    const fresh: Pending[] = list.map((f, i) => ({ key: `${Date.now()}-${i}`, name: f.name, status: "reading" }));
    setPending((p) => [...fresh, ...p]);
    // 한 장씩 차례로 읽는다(동시에 여러 번 부르지 않음)
    for (let i = 0; i < list.length; i++) {
      const key = fresh[i].key;
      try {
        const image = await shrinkPhoto(list[i]);
        const r = await rpc<{ evidence: Evidence }>("rcptReadPhoto", { image, mode: "evidence" });
        setPending((p) => p.map((x) => (x.key === key ? { ...x, status: "ready", ev: r.evidence } : x)));
      } catch (e) {
        setPending((p) => p.map((x) => (x.key === key ? { ...x, status: "error", error: (e as Error).message } : x)));
      }
    }
  };

  const save = async (key: string, ev: Evidence) => {
    try {
      await rpc("rcptSaveEvidence", { evidence: ev });
      setPending((p) => p.filter((x) => x.key !== key));
      notify({ text: `${ev.vendor || "증빙"} ${won(ev.total)}을(를) 장부에 저장했습니다.` });
      if (ev.date.slice(0, 7) !== month) setMonth(ev.date.slice(0, 7));
      else reload();
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    }
  };

  const remove = async (id?: string) => {
    if (!id || !confirm("이 증빙을 장부에서 지울까요?")) return;
    try {
      await rpc("rcptDeleteEvidence", { id });
      reload();
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    }
  };

  const download = async () => {
    try {
      const r = await rpc<{ filename: string; csv: string }>("rcptEvidenceCsv", { month });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([r.csv], { type: "text/csv;charset=utf-8" }));
      a.download = r.filename;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    }
  };

  const byKind = useMemo(() => {
    const m: Record<string, number> = {};
    for (const e of state.evidence) m[e.kind] = (m[e.kind] ?? 0) + e.total;
    return m;
  }, [state.evidence]);

  return (
    <section className="rc-sec">
      <label className="rc-drop">
        <input type="file" accept="image/*" multiple capture="environment" onChange={(e) => { void onFiles(e.target.files); e.target.value = ""; }} />
        <span className="rc-drop-icon">📷</span>
        <strong>영수증·세금계산서·현금영수증·카드전표 사진 올리기</strong>
        <span>휴대폰에서는 바로 촬영할 수 있습니다. 한 번에 10장까지 · AI가 날짜·거래처·금액·부가세를 읽어 채워 줍니다(회원님 본인 AI 키, 장당 약 10원 안팎).</span>
      </label>
      <div className="rc-row-btns">
        <button type="button" className="rc-btn ghost" onClick={() => setManual((v) => !v)}>{manual ? "직접 입력 닫기" : "✏️ 사진 없이 직접 입력"}</button>
      </div>
      {manual && <EvidenceForm initial={{ kind: "receipt", date: today(), vendor: "", bizNo: "", supply: 0, vat: 0, total: 0, payment: "", memo: "" }} onSave={(ev) => void save("manual", ev).then(() => setManual(false))} onCancel={() => setManual(false)} />}
      {pending.map((p) => (
        <div key={p.key} className={`rc-card ${p.status}`}>
          <div className="rc-card-head"><span>📄 {p.name}</span>
            {p.status === "reading" && <span className="rc-chip">읽는 중…</span>}
            {p.status === "error" && <button type="button" className="rc-x" onClick={() => setPending((x) => x.filter((y) => y.key !== p.key))} aria-label="닫기">✕</button>}
          </div>
          {p.status === "error" && <p className="rc-err">{p.error}</p>}
          {p.status === "ready" && p.ev && <EvidenceForm initial={p.ev} hint="AI가 읽은 값입니다. 틀린 곳을 고친 뒤 저장하세요." onSave={(ev) => void save(p.key, ev)} onCancel={() => setPending((x) => x.filter((y) => y.key !== p.key))} />}
        </div>
      ))}

      <div className="rc-ledger-head">
        <h2>📒 증빙 장부</h2>
        <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="월 고르기" />
        <button type="button" className="rc-btn" onClick={() => void download()}>⬇️ 엑셀(CSV) 내려받기</button>
      </div>
      <div className="rc-sum">
        <div><span>건수</span><b>{state.summary.count}건</b></div>
        <div><span>공급가액</span><b>{won(state.summary.supply)}</b></div>
        <div><span>부가세</span><b>{won(state.summary.vat)}</b></div>
        <div><span>합계</span><b>{won(state.summary.total)}</b></div>
      </div>
      {Object.keys(byKind).length > 0 && (
        <p className="rc-hint">{Object.entries(byKind).map(([k, v]) => `${EVIDENCE_KINDS[k as EvidenceKind] ?? k} ${won(v)}`).join(" · ")}</p>
      )}
      {state.evidence.length === 0 ? (
        <div className="aww-inbox-empty"><div className="aww-inbox-empty-icon">🧾</div><p>이 달에 저장한 증빙이 없습니다. 위에서 사진을 올려 보세요.</p></div>
      ) : (
        <div className="rc-table-wrap">
          <table className="rc-table">
            <thead><tr><th>날짜</th><th>종류</th><th>거래처</th><th>사업자번호</th><th className="num">공급가액</th><th className="num">부가세</th><th className="num">합계</th><th>결제</th><th></th></tr></thead>
            <tbody>
              {state.evidence.map((e) => (
                <tr key={e.id}>
                  <td>{e.date}</td><td>{EVIDENCE_KINDS[e.kind] ?? e.kind}</td><td title={e.memo}>{e.vendor}</td><td>{e.bizNo}</td>
                  <td className="num">{won(e.supply)}</td><td className="num">{won(e.vat)}</td><td className="num"><b>{won(e.total)}</b></td><td>{e.payment}</td>
                  <td><button type="button" className="rc-x" onClick={() => void remove(e.id)} aria-label="지우기">🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="rc-hint">⚠️ 장부는 저장한 날부터 {state.retentionDays}일 뒤 자동으로 지워집니다(생성 데이터 보관 규칙). 매달 「엑셀(CSV) 내려받기」로 보관하세요. 사진은 읽기만 하고 저장하지 않습니다.</p>
    </section>
  );
}

function EvidenceForm({ initial, hint, onSave, onCancel }: { initial: Evidence; hint?: string; onSave: (e: Evidence) => void; onCancel: () => void }) {
  const [ev, setEv] = useState<Evidence>(initial);
  const set = (patch: Partial<Evidence>) => setEv((e) => ({ ...e, ...patch }));
  const num = (v: string) => Number(v.replace(/[^\d-]/g, "")) || 0;
  return (
    <div className="rc-form">
      {hint && <p className="rc-hint">{hint}</p>}
      <div className="rc-grid">
        <label>종류<select value={ev.kind} onChange={(e) => set({ kind: e.target.value as EvidenceKind })}>{Object.entries(EVIDENCE_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label>날짜<input type="date" value={ev.date} onChange={(e) => set({ date: e.target.value })} /></label>
        <label>거래처(상호)<input value={ev.vendor} onChange={(e) => set({ vendor: e.target.value })} /></label>
        <label>사업자등록번호<input value={ev.bizNo} onChange={(e) => set({ bizNo: e.target.value })} placeholder="123-45-67890" /></label>
        <label>공급가액<input inputMode="numeric" value={ev.supply} onChange={(e) => set({ supply: num(e.target.value) })} /></label>
        <label>부가세<input inputMode="numeric" value={ev.vat} onChange={(e) => set({ vat: num(e.target.value) })} /></label>
        <label>합계<input inputMode="numeric" value={ev.total} onChange={(e) => set({ total: num(e.target.value) })} /></label>
        <label>결제수단<input value={ev.payment} onChange={(e) => set({ payment: e.target.value })} placeholder="카드·현금·계좌이체" /></label>
        <label className="wide">메모(품목)<input value={ev.memo} onChange={(e) => set({ memo: e.target.value })} /></label>
      </div>
      {ev.supply + ev.vat !== ev.total && ev.total > 0 && <p className="rc-err">공급가액 + 부가세({won(ev.supply + ev.vat)})가 합계와 다릅니다. 확인해 주세요.</p>}
      <div className="rc-row-btns">
        <button type="button" className="rc-btn" onClick={() => onSave(ev)}>💾 장부에 저장</button>
        <button type="button" className="rc-btn ghost" onClick={onCancel}>버리기</button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- ✍️ 발행
function IssueTab({ state, reload, notify, print, goInfo }: { state: State; reload: () => void; notify: (n: { text: string; error?: boolean }) => void; print: (d: Doc) => void; goInfo: () => void }) {
  const [kind, setKind] = useState<DocKind>("statement");
  const [date, setDate] = useState(today());
  const [partner, setPartner] = useState<Biz>(EMPTY_BIZ);
  const [lines, setLines] = useState<Line[]>([{ name: "", spec: "", qty: 1, unitPrice: 0 }]);
  const [taxMode, setTaxMode] = useState<TaxMode>("separate");
  const [purpose, setPurpose] = useState("영수");
  const [memo, setMemo] = useState("");
  const [reading, setReading] = useState(false);

  const calcd = lines.map((l) => ({ ...l, ...calc(l.qty, l.unitPrice, taxMode) }));
  const totals = calcd.reduce((s, l) => ({ supply: s.supply + l.supply, tax: s.tax + l.tax }), { supply: 0, tax: 0 });
  const setLine = (i: number, patch: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  const fromPhoto = async (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    setReading(true);
    try {
      const r = await rpc<{ issue: { partner: Biz; date: string; lines: Line[]; memo: string } }>("rcptReadPhoto", { image: await shrinkPhoto(f), mode: "issue" });
      if (r.issue.partner?.name) setPartner({ ...EMPTY_BIZ, ...r.issue.partner });
      if (/^\d{4}-\d{2}-\d{2}$/.test(r.issue.date)) setDate(r.issue.date);
      if (r.issue.lines?.length) setLines(r.issue.lines.map((l) => ({ name: l.name, spec: l.spec, qty: l.qty || 1, unitPrice: l.unitPrice })));
      if (r.issue.memo) setMemo(r.issue.memo);
      notify({ text: "사진에서 읽은 값으로 채웠습니다. 확인 후 저장하세요." });
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    } finally {
      setReading(false);
    }
  };

  const save = async (andPrint: boolean) => {
    try {
      const r = await rpc<{ doc: Omit<Doc, "createdTime"> }>("rcptSaveDoc", { doc: { kind, date, partner, lines, taxMode, purpose, memo } });
      notify({ text: `${DOC_KINDS[kind]}를 저장했습니다.` });
      reload();
      if (andPrint) print({ ...r.doc, createdTime: Date.now() } as Doc);
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    }
  };

  // 홈택스 일괄 발급 엑셀(2026-11-12): 저장한 세금계산서를 골라 공식 양식에 채워 내려받기
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [making, setMaking] = useState(false);
  const taxDocs = state.docs.filter((d) => d.kind === "tax_invoice");
  const togglePick = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const pickAll = () => setPicked((s) => (taxDocs.every((d) => s.has(d.id)) ? new Set() : new Set(taxDocs.slice(0, 100).map((d) => d.id))));
  const makeHometax = async () => {
    const ids = taxDocs.filter((d) => picked.has(d.id)).map((d) => d.id);
    if (!ids.length) return notify({ text: "홈택스 엑셀로 만들 세금계산서를 표에서 골라 주세요.", error: true });
    setMaking(true);
    try {
      const r = await rpc<{ filename: string; base64: string; count: number; skipped: { partner: string; date: string; reasons: string[] }[] }>("rcptHometaxXlsx", { ids });
      const bin = Uint8Array.from(atob(r.base64), (c) => c.charCodeAt(0));
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([bin], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
      a.download = r.filename;
      a.click();
      URL.revokeObjectURL(a.href);
      const skip = r.skipped.length ? ` 빠진 ${r.skipped.length}건: ${r.skipped.map((s) => `${s.date} ${s.partner || "(거래처 없음)"} — ${s.reasons[0]}`).join(" / ")}` : "";
      notify({ text: `홈택스 일괄 발급 엑셀(${r.count}건)을 내려받았습니다.${skip}`, error: r.skipped.length > 0 });
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    } finally {
      setMaking(false);
    }
  };

  const del = async (id: string) => {
    if (!confirm("이 문서를 지울까요?")) return;
    try {
      await rpc("rcptDeleteDoc", { id });
      reload();
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    }
  };

  return (
    <section className="rc-sec">
      {!state.profile?.name && (
        <div className="aww-inbox-notice"><span>먼저 「🏢 내 사업자」에 공급자(내 사업자) 정보를 저장하면 문서에 자동으로 들어갑니다.</span><button type="button" className="rc-btn" onClick={goInfo}>내 사업자 입력</button></div>
      )}
      <div className="rc-form">
        <div className="rc-grid">
          <label>문서<select value={kind} onChange={(e) => setKind(e.target.value as DocKind)}>{Object.entries(DOC_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
          <label>작성일자<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label>부가세<select value={taxMode} onChange={(e) => setTaxMode(e.target.value as TaxMode)}><option value="separate">별도(단가 + 10%)</option><option value="included">포함(단가에 부가세 포함)</option><option value="none">없음(면세)</option></select></label>
          {kind === "tax_invoice" && <label>영수/청구<select value={purpose} onChange={(e) => setPurpose(e.target.value)}><option>영수</option><option>청구</option></select></label>}
        </div>
        <h3>받는 쪽(거래처)</h3>
        <div className="rc-row-btns">
          <select value="" onChange={(e) => { const p = state.partners.find((x) => x.id === e.target.value); if (p) setPartner(p); }} aria-label="거래처 고르기">
            <option value="">거래처 주소록에서 고르기…</option>
            {state.partners.map((p) => <option key={p.id} value={p.id}>{p.name} {p.bizNo}</option>)}
          </select>
          <label className="rc-btn ghost">{reading ? "읽는 중…" : "📷 사진으로 채우기"}<input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void fromPhoto(e.target.files); e.target.value = ""; }} /></label>
        </div>
        <BizFields value={partner} onChange={setPartner} />
        <h3>품목</h3>
        <div className="rc-table-wrap">
          <table className="rc-table">
            <thead><tr><th>품목</th><th>규격</th><th className="num">수량</th><th className="num">단가</th><th className="num">공급가액</th><th className="num">세액</th><th></th></tr></thead>
            <tbody>
              {calcd.map((l, i) => (
                <tr key={i}>
                  <td><input value={l.name} list="rc-items" onChange={(e) => { const it = state.items.find((x) => x.name === e.target.value); setLine(i, it ? { name: it.name, spec: it.spec, unitPrice: it.unitPrice } : { name: e.target.value }); }} /></td>
                  <td><input value={l.spec} onChange={(e) => setLine(i, { spec: e.target.value })} /></td>
                  <td className="num"><input inputMode="decimal" value={l.qty} onChange={(e) => setLine(i, { qty: Number(e.target.value) || 0 })} /></td>
                  <td className="num"><input inputMode="numeric" value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></td>
                  <td className="num">{won(l.supply)}</td><td className="num">{won(l.tax)}</td>
                  <td><button type="button" className="rc-x" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))} aria-label="줄 지우기">✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          <datalist id="rc-items">{state.items.map((it) => <option key={it.id} value={it.name} />)}</datalist>
        </div>
        <div className="rc-row-btns">
          <button type="button" className="rc-btn ghost" onClick={() => setLines((ls) => [...ls, { name: "", spec: "", qty: 1, unitPrice: 0 }])}>＋ 품목 추가</button>
        </div>
        <div className="rc-sum">
          <div><span>공급가액</span><b>{won(totals.supply)}</b></div>
          <div><span>세액</span><b>{won(totals.tax)}</b></div>
          <div><span>합계</span><b>{won(totals.supply + totals.tax)}</b></div>
        </div>
        <label className="wide">비고<input value={memo} onChange={(e) => setMemo(e.target.value)} /></label>
        <div className="rc-row-btns">
          <button type="button" className="rc-btn" onClick={() => void save(true)}>🖨️ 저장하고 인쇄·PDF</button>
          <button type="button" className="rc-btn ghost" onClick={() => void save(false)}>💾 저장만</button>
        </div>
        {kind === "tax_invoice" && (
          <p className="rc-hint">ℹ️ 세금계산서는 국세청 홈택스에서 발급해야 효력이 있습니다. 저장한 뒤 아래 「저장한 문서」에서 골라 「🧾 홈택스 일괄 발급 엑셀」을 누르면 홈택스 공식 양식에 채운 파일이 내려받아집니다 → 홈택스 「전자(세금)계산서 일괄발급」에 올려 발급하세요(한 장에 품목 4줄까지). 인쇄본은 확인용입니다.</p>
        )}
        {kind === "receipt" && <p className="rc-hint">ℹ️ 간이영수증은 법정 세금계산서가 아닙니다(거래 확인용).</p>}
      </div>

      <h2>🗂️ 저장한 문서</h2>
      {taxDocs.length > 0 && (
        <div className="rc-row-btns">
          <button type="button" className="rc-btn" disabled={making || picked.size === 0} onClick={() => void makeHometax()}>{making ? "만드는 중…" : `🧾 홈택스 일괄 발급 엑셀 (${taxDocs.filter((d) => picked.has(d.id)).length}건)`}</button>
          <button type="button" className="rc-btn ghost" onClick={pickAll}>세금계산서 전체 고르기·풀기</button>
          <a className="rc-btn ghost" href="https://www.hometax.go.kr" target="_blank" rel="noreferrer">홈택스 열기 ↗</a>
        </div>
      )}
      {state.docs.length === 0 ? <p className="rc-hint">아직 저장한 문서가 없습니다.</p> : (
        <div className="rc-table-wrap">
          <table className="rc-table">
            <thead><tr><th aria-label="홈택스 엑셀에 넣기">🧾</th><th>작성일자</th><th>문서</th><th>거래처</th><th className="num">합계</th><th></th></tr></thead>
            <tbody>
              {state.docs.map((d) => (
                <tr key={d.id}>
                  <td>{d.kind === "tax_invoice" ? <input type="checkbox" checked={picked.has(d.id)} onChange={() => togglePick(d.id)} aria-label={`${d.partner?.name ?? ""} 세금계산서 고르기`} /> : null}</td>
                  <td>{d.date}</td><td>{DOC_KINDS[d.kind]}</td><td>{d.partner?.name}</td><td className="num">{won(d.total)}</td>
                  <td className="rc-actions"><button type="button" className="rc-btn ghost" onClick={() => print(d)}>🖨️ 인쇄</button><button type="button" className="rc-x" onClick={() => void del(d.id)} aria-label="지우기">🗑</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="rc-hint">⚠️ 저장한 문서는 {state.retentionDays}일 뒤 자동으로 지워집니다. 필요한 문서는 인쇄·PDF로 보관하세요.</p>
    </section>
  );
}

function BizFields({ value, onChange }: { value: Biz; onChange: (b: Biz) => void }) {
  const f = (k: keyof Biz, label: string, ph = "", wide = false) => (
    <label className={wide ? "wide" : undefined}>{label}<input value={(value[k] as string) ?? ""} placeholder={ph} onChange={(e) => onChange({ ...value, [k]: e.target.value })} /></label>
  );
  return (
    <div className="rc-grid">
      {f("name", "상호")}{f("bizNo", "사업자등록번호", "123-45-67890")}{f("ceo", "대표자")}{f("phone", "전화")}
      {f("bizType", "업태")}{f("bizItem", "종목")}{f("email", "이메일")}{f("address", "주소", "", true)}
    </div>
  );
}

// ---------------------------------------------------------------- 🏢 내 사업자·거래처·품목
function InfoTab({ state, reload, notify }: { state: State; reload: () => void; notify: (n: { text: string; error?: boolean }) => void }) {
  const [me, setMe] = useState<Biz>(state.profile ?? EMPTY_BIZ);
  const [partner, setPartner] = useState<Biz>(EMPTY_BIZ);
  const [item, setItem] = useState<Item>({ name: "", spec: "", unitPrice: 0 });
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    try {
      await fn();
      notify({ text: ok });
      reload();
    } catch (e) {
      notify({ text: (e as Error).message, error: true });
    }
  };
  return (
    <section className="rc-sec">
      <div className="rc-form">
        <h2>🏢 내 사업자(공급자)</h2>
        <BizFields value={me} onChange={setMe} />
        <div className="rc-row-btns"><button type="button" className="rc-btn" onClick={() => void run(() => rpc("rcptSaveProfile", { profile: me }), "내 사업자 정보를 저장했습니다.")}>💾 저장</button></div>
      </div>
      <div className="rc-form">
        <h2>📇 거래처 주소록</h2>
        <BizFields value={partner} onChange={setPartner} />
        <div className="rc-row-btns">
          <button type="button" className="rc-btn" onClick={() => void run(() => rpc("rcptSavePartner", { partner }), `${partner.name || "거래처"}을(를) 저장했습니다.`).then(() => setPartner(EMPTY_BIZ))}>{partner.id ? "💾 고친 내용 저장" : "＋ 거래처 추가"}</button>
          {partner.id && <button type="button" className="rc-btn ghost" onClick={() => setPartner(EMPTY_BIZ)}>새로 입력</button>}
        </div>
        {state.partners.length > 0 && (
          <ul className="rc-list">
            {state.partners.map((p) => (
              <li key={p.id}><button type="button" className="rc-link" onClick={() => setPartner(p)}>{p.name}</button> <span>{p.bizNo} · {p.ceo}</span>
                <button type="button" className="rc-x" aria-label="지우기" onClick={() => confirm(`${p.name}을(를) 지울까요?`) && void run(() => rpc("rcptDeletePartner", { id: p.id }), "거래처를 지웠습니다.")}>🗑</button></li>
            ))}
          </ul>
        )}
      </div>
      <div className="rc-form">
        <h2>📦 자주 쓰는 품목</h2>
        <div className="rc-grid">
          <label>품목<input value={item.name} onChange={(e) => setItem({ ...item, name: e.target.value })} /></label>
          <label>규격<input value={item.spec} onChange={(e) => setItem({ ...item, spec: e.target.value })} /></label>
          <label>단가<input inputMode="numeric" value={item.unitPrice} onChange={(e) => setItem({ ...item, unitPrice: Number(e.target.value.replace(/\D/g, "")) || 0 })} /></label>
        </div>
        <div className="rc-row-btns"><button type="button" className="rc-btn" onClick={() => void run(() => rpc("rcptSaveItem", { item }), `${item.name || "품목"}을(를) 저장했습니다.`).then(() => setItem({ name: "", spec: "", unitPrice: 0 }))}>{item.id ? "💾 고친 내용 저장" : "＋ 품목 추가"}</button></div>
        {state.items.length > 0 && (
          <ul className="rc-list">
            {state.items.map((it) => (
              <li key={it.id}><button type="button" className="rc-link" onClick={() => setItem(it)}>{it.name}</button> <span>{it.spec} · {won(it.unitPrice)}</span>
                <button type="button" className="rc-x" aria-label="지우기" onClick={() => confirm(`${it.name}을(를) 지울까요?`) && void run(() => rpc("rcptDeleteItem", { id: it.id }), "품목을 지웠습니다.")}>🗑</button></li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------- 인쇄·PDF
function PrintView({ doc, me }: { doc: Doc; me: Biz }) {
  const party = (b: Biz) => (
    <table className="rc-p-party">
      <tbody>
        <tr><th>등록번호</th><td colSpan={3}>{b.bizNo}</td></tr>
        <tr><th>상호</th><td>{b.name}</td><th>성명</th><td>{b.ceo}</td></tr>
        <tr><th>주소</th><td colSpan={3}>{b.address}</td></tr>
        <tr><th>업태</th><td>{b.bizType}</td><th>종목</th><td>{b.bizItem}</td></tr>
      </tbody>
    </table>
  );
  return (
    <div className="rc-print-area" aria-hidden>
      <h1 className="rc-p-title">{DOC_KINDS[doc.kind]}{doc.kind === "tax_invoice" ? `(${doc.purpose}용 · 확인용 사본)` : ""}</h1>
      <p className="rc-p-date">작성일자 {doc.date}</p>
      <div className="rc-p-parties">
        <div><h2>공급자</h2>{party(me)}</div>
        <div><h2>공급받는자</h2>{party(doc.partner)}</div>
      </div>
      <table className="rc-p-lines">
        <thead><tr><th>품목</th><th>규격</th><th>수량</th><th>단가</th><th>공급가액</th><th>세액</th></tr></thead>
        <tbody>
          {doc.lines.map((l, i) => <tr key={i}><td>{l.name}</td><td>{l.spec}</td><td className="num">{l.qty}</td><td className="num">{won(l.unitPrice)}</td><td className="num">{won(l.supply)}</td><td className="num">{won(l.tax)}</td></tr>)}
        </tbody>
        <tfoot><tr><th colSpan={4}>합계 {won(doc.total)}</th><th className="num">{won(doc.supply)}</th><th className="num">{won(doc.tax)}</th></tr></tfoot>
      </table>
      {doc.memo && <p>비고: {doc.memo}</p>}
      {doc.kind === "receipt" && <p className="rc-p-foot">위 금액을 정히 영수합니다.</p>}
      {doc.kind === "tax_invoice" && <p className="rc-p-foot">※ 이 인쇄본은 확인용이며 법정 전자세금계산서가 아닙니다. 발급은 국세청 홈택스에서 합니다.</p>}
    </div>
  );
}
