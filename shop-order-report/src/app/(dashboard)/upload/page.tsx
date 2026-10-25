"use client";

import { useState } from "react";
import { Download, Trash2 } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { Dropzone } from "@/components/ui/Dropzone";
import { useData } from "@/components/DataProvider";
import { ACCEPT_SHEETS, readSheetBytes, sampleWorkbook, type SheetData } from "@/lib/sheet";
import { FIELDS, MARKETS, guessMapping, guessMarket, isPersonalColumn, marketLabel, missingRequired, type FieldId, type MarketId } from "@/lib/orders/markets";
import { mergeLines, toOrderLines, STATUS_LABEL } from "@/lib/orders/parse";
import { saveBlob } from "@/lib/download";
import { COUPANG_HEADERS, SMARTSTORE_HEADERS, sampleOrders } from "@/lib/sample";

interface Pending {
  id: string;
  fileName: string;
  sheet: SheetData;
  market: MarketId;
  map: Partial<Record<FieldId, string>>;
}

export default function UploadPage() {
  const { lines, setLines, settings, setSettings, ready } = useData();
  const [pending, setPending] = useState<Pending[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function addFiles(files: File[]) {
    setError(null);
    setMessage(null);
    const next: Pending[] = [];
    for (const file of files) {
      try {
        const sheet = readSheetBytes(new Uint8Array(await file.arrayBuffer()), file.name);
        if (!sheet.rows.length) throw new Error("내용 줄이 없습니다");
        const market = guessMarket(sheet.headers, file.name);
        const remembered = settings.mappings[market];
        const rememberedOk = remembered && Object.values(remembered).every((h) => h && sheet.headers.includes(h));
        next.push({ id: `${Date.now()}-${file.name}`, fileName: file.name, sheet, market, map: rememberedOk ? { ...remembered } : guessMapping(sheet.headers) });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        setError(`「${file.name}」을 읽지 못했습니다(${msg || "형식 오류"}). 암호가 걸린 엑셀이면 판매자센터에서 암호 없이 받거나 CSV로 받아 주세요.`);
      }
    }
    setPending((p) => [...p, ...next]);
  }

  const update = (id: string, patch: Partial<Pending>) => setPending((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  function commit() {
    let all = lines;
    let added = 0, updated = 0, skipped = 0;
    const mappings = { ...settings.mappings };
    for (const p of pending) {
      if (missingRequired(p.map).length) continue;
      const r = toOrderLines(p.sheet, p.market, p.map);
      const m = mergeLines(all, r.lines);
      all = m.lines;
      added += m.added;
      updated += m.updated;
      skipped += r.skipped.length;
      mappings[p.market] = p.map;
    }
    setLines(all);
    setSettings((s) => ({ ...s, mappings }));
    setPending((p) => p.filter((x) => missingRequired(x.map).length > 0));
    setMessage(`새 주문 줄 ${added}개를 더하고 ${updated}개를 최신 상태로 바꿨습니다${skipped ? ` (읽지 못한 줄 ${skipped}개 건너뜀)` : ""}. 지금 이 PC에 주문 줄 ${all.length}개가 있습니다.`);
  }

  function clearAll() {
    if (!lines.length || !window.confirm("이 PC에 보관한 주문을 모두 지울까요? 원본 엑셀 파일은 그대로입니다.")) return;
    setLines([]);
    setMessage("이 PC에 보관한 주문을 모두 지웠습니다. 설정(원가·열 맞춤)은 그대로입니다.");
  }

  const counts = MARKETS.map((m) => ({ ...m, n: lines.filter((l) => l.market === m.id).length })).filter((m) => m.n > 0);
  const range = lines.length ? `${lines[0].orderedAt} ~ ${lines[lines.length - 1].orderedAt}` : "";

  return (
    <div>
      <PageHeader emoji="📥" title="주문 파일 올리기" description="판매자센터에서 받은 주문 엑셀·CSV를 올리세요. 여러 마켓·여러 기간 파일을 한꺼번에 올려도 같은 주문은 한 번만 셉니다." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="space-y-4">
          <section className="slw-card space-y-3 p-4">
            <Dropzone accept={ACCEPT_SHEETS} label="주문 파일을 끌어 놓거나 눌러서 고르세요" hint="엑셀(.xlsx·.xls)·CSV · 여러 개 가능" onFiles={(f) => void addFiles(f)} />
            {error && <Notice tone="warn">{error}</Notice>}
            <Notice tone="tip">🔒 구매자 이름·주소·전화번호 열은 읽자마자 버리고, 주문 줄만 이 PC 브라우저에 보관합니다. 서버로는 아무것도 보내지 않습니다.</Notice>
          </section>
          <section className="slw-card space-y-2 p-4">
            <p className="text-sm font-extrabold text-slate-900">처음이신가요? 예시 파일로 연습</p>
            <p className="text-[12px] text-slate-600">가짜 주문 28일치(이름은 「예시」)입니다. 연습 뒤 「모두 지우기」로 지우고 실제 파일을 올리세요.</p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="slw-btn" onClick={() => saveBlob("예시_스마트스토어_주문.xlsx", sampleWorkbook(SMARTSTORE_HEADERS, sampleOrders("smartstore")))}><Download size={14} /> 스마트스토어 모양</button>
              <button type="button" className="slw-btn" onClick={() => saveBlob("예시_쿠팡_주문.xlsx", sampleWorkbook(COUPANG_HEADERS, sampleOrders("coupang")))}><Download size={14} /> 쿠팡 모양</button>
            </div>
          </section>
          <section className="slw-card space-y-2 p-4">
            <p className="text-sm font-extrabold text-slate-900">이 PC에 보관 중</p>
            {!ready ? (
              <p className="text-[13px] text-slate-600">불러오는 중…</p>
            ) : lines.length ? (
              <>
                <p className="text-[13px] text-slate-700">주문 줄 <b>{lines.length.toLocaleString()}</b>개 · {range}</p>
                <p className="text-[12px] text-slate-600">{counts.map((m) => `${m.label} ${m.n}`).join(" · ")}</p>
                <button type="button" className="slw-btn w-full" onClick={clearAll}><Trash2 size={14} /> 모두 지우기</button>
              </>
            ) : (
              <p className="text-[13px] text-slate-600">아직 없습니다.</p>
            )}
          </section>
        </div>

        <div className="space-y-4">
          {message && <Notice tone="tip">✅ {message}</Notice>}
          {pending.length === 0 ? (
            <div className="slw-card p-8 text-center text-sm text-slate-600">파일을 넣으면 여기에서 마켓과 열을 확인한 뒤 「주문 추가」를 누릅니다.</div>
          ) : (
            <>
              {pending.map((p) => {
                const miss = missingRequired(p.map);
                const usable = p.sheet.headers.filter((h) => !isPersonalColumn(h));
                const personal = p.sheet.headers.filter(isPersonalColumn);
                const preview = miss.length ? null : toOrderLines(p.sheet, p.market, p.map);
                return (
                  <section key={p.id} className="slw-card space-y-3 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-extrabold text-slate-900">📄 {p.fileName} <span className="font-normal text-slate-500">({p.sheet.rows.length}줄)</span></p>
                      <div className="flex items-center gap-2">
                        <select className="slw-field !w-auto" value={p.market} onChange={(e) => update(p.id, { market: e.target.value as MarketId })} aria-label="마켓">
                          {MARKETS.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                        </select>
                        <button type="button" className="slw-btn" onClick={() => setPending((x) => x.filter((y) => y.id !== p.id))}>빼기</button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {FIELDS.map((f) => (
                        <label key={f.id} className="block">
                          <span className="slw-label">{f.label}{f.required ? " *" : " (선택)"}</span>
                          <select className={`slw-field ${f.required && !p.map[f.id] ? "!border-rose-400" : ""}`} value={p.map[f.id] ?? ""} onChange={(e) => update(p.id, { map: { ...p.map, [f.id]: e.target.value || undefined } })}>
                            <option value="">— 없음 —</option>
                            {usable.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                    {personal.length > 0 && <p className="text-[12px] text-slate-600">🔒 버리는 개인정보 열: {personal.join(", ")}</p>}
                    {miss.length > 0 ? (
                      <Notice tone="warn">꼭 필요한 열({miss.join(", ")})을 골라 주세요.</Notice>
                    ) : (
                      preview && (
                        <div className="text-[12px] text-slate-700">
                          <p>
                            읽을 수 있는 줄 <b>{preview.lines.length}</b>개
                            {preview.skipped.length > 0 && ` · 건너뛸 줄 ${preview.skipped.length}개(${[...new Set(preview.skipped.map((s) => s.reason))].join(", ")})`}
                          </p>
                          {preview.lines[0] && (
                            <p className="mt-1 truncate text-slate-500">
                              예: {preview.lines[0].orderedAt} · {preview.lines[0].product} · {preview.lines[0].qty}개 · {preview.lines[0].amount.toLocaleString()}원 · {STATUS_LABEL[preview.lines[0].status]}({preview.lines[0].statusRaw || "상태 없음"}) · {marketLabel(p.market)}
                            </p>
                          )}
                        </div>
                      )
                    )}
                  </section>
                );
              })}
              <button type="button" className="slw-primary w-full" disabled={pending.every((p) => missingRequired(p.map).length > 0)} onClick={commit}>
                주문 추가 ({pending.filter((p) => !missingRequired(p.map).length).length}개 파일)
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
