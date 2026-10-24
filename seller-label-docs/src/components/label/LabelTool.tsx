"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileSpreadsheet, Printer, RotateCcw } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { LabelCell } from "@/components/label/LabelCell";
import { SHEET_PRESETS, assignToPages, cellRects, totalCells, validateSheet, fillTemplate, type LabelSheet } from "@/lib/label/layout";
import { CODE_TYPES, checkCodeValue } from "@/lib/label/barcode";
import { DEFAULT_TEMPLATE, FOOD_FIELDS, SAMPLE_HEADERS, SAMPLE_ROWS, type LabelTemplate } from "@/lib/label/template";
import { ACCEPT_SHEETS, parsePasted, readSheetBytes, sampleWorkbook, type SheetData } from "@/lib/sheet";
import { loadLocal, saveBlob, saveLocal } from "@/lib/download";

const STORE_KEY = "sld-label-v1";
const MM_PX = 96 / 25.4;

interface Settings {
  sheetId: string;
  custom: LabelSheet;
  template: LabelTemplate;
  source: "sheet" | "same";
  sameCount: number;
  startCell: number;
  copies: number;
  dx: number;
  dy: number;
  showBorder: boolean;
}

const DEFAULTS: Settings = {
  sheetId: "a4-21",
  custom: { ...SHEET_PRESETS.find((s) => s.id === "a4-21")!, id: "custom", name: "직접 입력" },
  template: DEFAULT_TEMPLATE,
  source: "sheet",
  sameCount: 21,
  startCell: 0,
  copies: 1,
  dx: 0,
  dy: 0,
  showBorder: true,
};

function num(v: string, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function NumberField({ label, value, onChange, step = 0.1, min }: { label: string; value: number; onChange: (n: number) => void; step?: number; min?: number }) {
  return (
    <label className="block">
      <span className="slw-label">{label}</span>
      <input type="number" className="slw-field" value={value} step={step} min={min} onChange={(e) => onChange(num(e.target.value, value))} />
    </label>
  );
}

function Section({ step, title, children }: { step: number; title: string; children: React.ReactNode }) {
  return (
    <section className="slw-card p-4">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-slate-900">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-700 text-xs text-white">{step}</span>
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

/** A4 한 장(실제 mm 크기). 미리보기에서는 바깥에서 축소하고, 인쇄에서는 그대로 쓴다. */
function LabelPage({ sheet, rects, cells, template, showBorder, onCellClick, startCell }: {
  sheet: LabelSheet;
  rects: ReturnType<typeof cellRects>;
  cells: (Record<string, string> | null)[];
  template: LabelTemplate;
  showBorder: boolean;
  onCellClick?: (i: number) => void;
  startCell?: number;
}) {
  return (
    <div className="label-page">
      {rects.map((r) => {
        const rec = cells[r.index];
        const skipped = startCell != null && r.index < startCell;
        return (
          <div
            key={r.index}
            className="label-cell"
            onClick={onCellClick ? () => onCellClick(r.index) : undefined}
            title={onCellClick ? `${r.index + 1}번 칸부터 인쇄 시작` : undefined}
            style={{
              left: `${r.x}mm`,
              top: `${r.y}mm`,
              width: `${r.w}mm`,
              height: `${r.h}mm`,
              borderRadius: sheet.round ? "50%" : "1.5mm",
              outline: showBorder ? "0.2mm dashed #94a3b8" : undefined,
              background: skipped ? "repeating-linear-gradient(45deg,#f1f5f9,#f1f5f9 2mm,#e2e8f0 2mm,#e2e8f0 4mm)" : undefined,
              cursor: onCellClick ? "pointer" : undefined,
            }}
          >
            {rec ? <LabelCell template={template} record={rec} /> : null}
          </div>
        );
      })}
    </div>
  );
}

export default function LabelTool() {
  const [s, setS] = useState<Settings>(DEFAULTS);
  const [data, setData] = useState<SheetData>({ headers: SAMPLE_HEADERS, rows: SAMPLE_ROWS.map((r) => Object.fromEntries(SAMPLE_HEADERS.map((h, i) => [h, r[i]]))) });
  const [dataName, setDataName] = useState("예시 표(2줄)");
  const [paste, setPaste] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState(0);
  const [mounted, setMounted] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    const saved = loadLocal<Settings>(STORE_KEY, DEFAULTS);
    setS({ ...saved, template: { ...DEFAULT_TEMPLATE, ...saved.template } });
    setMounted(true);
  }, []);
  useEffect(() => {
    if (mounted) saveLocal(STORE_KEY, s);
  }, [s, mounted]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / (210 * MM_PX))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const sheet = s.sheetId === "custom" ? s.custom : SHEET_PRESETS.find((p) => p.id === s.sheetId) ?? SHEET_PRESETS[0];
  const sheetErrors = validateSheet(sheet);
  const per = totalCells(sheet);
  const rects = useMemo(() => cellRects(sheet, { dx: s.dx, dy: s.dy }), [sheet, s.dx, s.dy]);
  const items = s.source === "same" ? Array.from({ length: Math.max(0, Math.min(5000, s.sameCount)) }, () => ({})) : data.rows;
  const pages = useMemo(() => (sheetErrors.length ? [] : assignToPages<Record<string, string>>(per, items, s.startCell, s.copies)), [per, items, s.startCell, s.copies, sheetErrors.length]);
  const page = Math.min(previewPage, Math.max(0, pages.length - 1));

  const codeProblems = useMemo(() => {
    if (s.template.kind !== "text" || s.template.code === "none") return [];
    const out: string[] = [];
    items.forEach((rec, i) => {
      const msg = checkCodeValue(s.template.code, fillTemplate(s.template.codeValue, rec));
      if (msg && out.length < 3) out.push(`${s.source === "same" ? "" : `${i + 2}번째 줄: `}${msg}`);
    });
    return out;
  }, [items, s.template, s.source]);

  const set = (patch: Partial<Settings>) => setS((prev) => ({ ...prev, ...patch }));
  const setT = (patch: Partial<LabelTemplate>) => setS((prev) => ({ ...prev, template: { ...prev.template, ...patch } }));
  const setCustom = (patch: Partial<LabelSheet>) => setS((prev) => ({ ...prev, custom: { ...prev.custom, ...patch } }));

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    try {
      const parsed = readSheetBytes(new Uint8Array(await file.arrayBuffer()), file.name);
      if (!parsed.rows.length) throw new Error("내용이 있는 줄이 없습니다. 첫 줄은 열 이름, 둘째 줄부터 내용이어야 합니다.");
      setData(parsed);
      setDataName(`${file.name} (${parsed.rows.length}줄)`);
      set({ source: "sheet" });
      setPreviewPage(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일을 읽지 못했습니다.");
    }
  }

  function applyPaste() {
    const parsed = parsePasted(paste);
    if (!parsed.rows.length) {
      setError("붙여 넣은 표에 내용 줄이 없습니다. 열 이름 줄 + 내용 줄을 함께 복사해 주세요.");
      return;
    }
    setError(null);
    setData(parsed);
    setDataName(`붙여 넣은 표 (${parsed.rows.length}줄)`);
    set({ source: "sheet" });
    setPreviewPage(0);
  }

  const insertField = (h: string) => setT({ text: `${s.template.text}${s.template.text.endsWith("\n") || !s.template.text ? "" : " "}{${h}}` });

  return (
    <div>
      <PageHeader emoji="🏷" title="라벨 인쇄" description="A4 라벨지 칸마다 상품명·주소·바코드·QR·식품 표시사항을 채워 인쇄합니다." />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
        <div className="space-y-4">
          <Section step={1} title="라벨지 규격">
            <label className="block">
              <span className="slw-label">라벨지 칸 수·크기</span>
              <select className="slw-field" value={s.sheetId} onChange={(e) => { set({ sheetId: e.target.value, startCell: 0 }); setPreviewPage(0); }}>
                {SHEET_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
                <option value="custom">✏ 직접 입력(포장지 규격대로)</option>
              </select>
            </label>
            {s.sheetId === "custom" ? (
              <div className="grid grid-cols-2 gap-2">
                <NumberField label="가로 칸 수" value={s.custom.cols} step={1} min={1} onChange={(n) => setCustom({ cols: Math.round(n) })} />
                <NumberField label="세로 칸 수" value={s.custom.rows} step={1} min={1} onChange={(n) => setCustom({ rows: Math.round(n) })} />
                <NumberField label="칸 가로(mm)" value={s.custom.cellW} onChange={(n) => setCustom({ cellW: n })} />
                <NumberField label="칸 세로(mm)" value={s.custom.cellH} onChange={(n) => setCustom({ cellH: n })} />
                <NumberField label="위 여백(mm)" value={s.custom.marginTop} onChange={(n) => setCustom({ marginTop: n })} />
                <NumberField label="왼쪽 여백(mm)" value={s.custom.marginLeft} onChange={(n) => setCustom({ marginLeft: n })} />
                <NumberField label="칸 사이 가로 간격(mm)" value={s.custom.gapX} onChange={(n) => setCustom({ gapX: n })} />
                <NumberField label="칸 사이 세로 간격(mm)" value={s.custom.gapY} onChange={(n) => setCustom({ gapY: n })} />
                <label className="col-span-2 flex items-center gap-2 text-[13px] text-slate-700">
                  <input type="checkbox" checked={!!s.custom.round} onChange={(e) => setCustom({ round: e.target.checked })} /> 원형 라벨
                </label>
              </div>
            ) : (
              <p className="text-[12px] text-slate-600">
                여백 {sheet.marginTop}mm(위) · {sheet.marginLeft}mm(왼쪽) · 간격 {sheet.gapX}/{sheet.gapY}mm — 종이 가운데 정렬 기준 값입니다.
              </p>
            )}
            {sheetErrors.length > 0 && <Notice tone="warn">{sheetErrors.join(" ")}</Notice>}
            <Notice tone="warn">
              ⚠ 제조사마다 여백이 조금씩 다릅니다. 라벨지 포장에 적힌 규격이 다르면 「직접 입력」으로 바꾸고, 처음 한 장은 보통 종이에 인쇄해 라벨지와 겹쳐 본 뒤 4번 「위치 보정」으로 맞춰 주세요.
            </Notice>
          </Section>

          <Section step={2} title="칸에 넣을 내용">
            <div className="flex gap-2">
              <button type="button" className={s.template.kind === "text" ? "slw-primary" : "slw-btn"} onClick={() => setT({ kind: "text" })}>글자·바코드·QR</button>
              <button type="button" className={s.template.kind === "food" ? "slw-primary" : "slw-btn"} onClick={() => setT({ kind: "food" })}>식품 한글표시사항</button>
            </div>

            {s.template.kind === "text" ? (
              <>
                <label className="block">
                  <span className="slw-label">글자(줄바꿈 그대로 · {"{열 이름}"}은 표 값으로 바뀜)</span>
                  <textarea className="slw-field min-h-[90px] font-mono" value={s.template.text} onChange={(e) => setT({ text: e.target.value })} />
                </label>
                {s.source === "sheet" && data.headers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {data.headers.map((h) => (
                      <button key={h} type="button" className="rounded-md border border-teal-200 bg-teal-50 px-2 py-0.5 text-[12px] font-bold text-teal-800" onClick={() => insertField(h)}>
                        +{"{"}{h}{"}"}
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="글자 크기(pt)" value={s.template.fontPt} step={0.5} min={4} onChange={(n) => setT({ fontPt: Math.max(4, n) })} />
                  <label className="block">
                    <span className="slw-label">정렬</span>
                    <select className="slw-field" value={s.template.align} onChange={(e) => setT({ align: e.target.value as LabelTemplate["align"] })}>
                      <option value="left">왼쪽</option>
                      <option value="center">가운데</option>
                    </select>
                  </label>
                </div>
                <label className="flex items-center gap-2 text-[13px] text-slate-700">
                  <input type="checkbox" checked={s.template.boldFirst} onChange={(e) => setT({ boldFirst: e.target.checked })} /> 첫 줄 굵게
                </label>
                <label className="block">
                  <span className="slw-label">바코드·QR</span>
                  <select
                    className="slw-field"
                    value={s.template.code}
                    onChange={(e) => {
                      const code = e.target.value as LabelTemplate["code"];
                      // 1차원 바코드는 글자 아래·높이 12mm(가로는 칸 너비), 2차원 코드는 글자 오른쪽·16mm 정사각형이 읽기 좋다
                      if (code === "code128" || code === "ean13") setT({ code, codePos: "bottom", codeSizeMm: 12 });
                      else if (code === "qrcode" || code === "datamatrix") setT({ code, codePos: "right", codeSizeMm: 16 });
                      else setT({ code });
                    }}
                  >
                    {CODE_TYPES.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </label>
                {s.template.code !== "none" && (
                  <div className="grid grid-cols-2 gap-2">
                    <label className="col-span-2 block">
                      <span className="slw-label">코드에 넣을 값(예: {"{바코드}"}, 주소)</span>
                      <input className="slw-field font-mono" value={s.template.codeValue} onChange={(e) => setT({ codeValue: e.target.value })} />
                    </label>
                    <label className="block">
                      <span className="slw-label">위치</span>
                      <select className="slw-field" value={s.template.codePos} onChange={(e) => setT({ codePos: e.target.value as LabelTemplate["codePos"] })}>
                        <option value="right">글자 오른쪽</option>
                        <option value="bottom">글자 아래</option>
                      </select>
                    </label>
                    <NumberField label={s.template.code === "qrcode" || s.template.code === "datamatrix" ? "코드 크기(mm)" : s.template.codePos === "bottom" ? "바코드 높이(mm)" : "바코드 너비(mm)"} value={s.template.codeSizeMm} step={1} min={5} onChange={(n) => setT({ codeSizeMm: Math.max(5, n) })} />
                  </div>
                )}
                {(s.template.code === "ean13" || s.template.code === "code128") && s.template.codePos === "right" && (
                  <p className="text-[12px] text-amber-800">⚠ 바코드를 글자 오른쪽에 두면 작아져 스캐너가 못 읽을 수 있습니다. 가로 30mm 이상이 되도록 「글자 아래」를 권장합니다.</p>
                )}
                {s.template.code === "ean13" && (
                  <p className="text-[12px] text-slate-600">EAN-13 번호는 GS1(대한상공회의소 유통물류진흥원)에서 발급받은 번호를 넣어 주세요. 여기서는 자릿수·검증 숫자만 확인합니다.</p>
                )}
                {codeProblems.length > 0 && <Notice tone="warn">{codeProblems.join(" / ")} — 이 칸은 코드 없이 인쇄됩니다.</Notice>}
              </>
            ) : (
              <>
                <div className="space-y-1.5">
                  {s.template.food.map((f, i) => (
                    <div key={f.label} className="grid grid-cols-[110px_1fr] items-center gap-2">
                      <span className="text-[12px] font-bold text-slate-700">{f.label}</span>
                      <input
                        className="slw-field"
                        placeholder={s.source === "sheet" ? `값 또는 {열 이름}` : "값"}
                        value={f.value}
                        onChange={(e) => {
                          const food = s.template.food.slice();
                          food[i] = { ...f, value: e.target.value };
                          setT({ food });
                        }}
                      />
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="글자 크기(pt)" value={s.template.fontPt} step={0.5} min={4} onChange={(n) => setT({ fontPt: Math.max(4, n) })} />
                  <button type="button" className="slw-btn self-end" onClick={() => setT({ food: FOOD_FIELDS.map((label) => ({ label, value: "" })) })}>
                    <RotateCcw size={14} /> 항목 비우기
                  </button>
                </div>
                <Notice tone="warn">
                  ⚠ 식품 유형마다 꼭 적어야 하는 항목과 글자 크기 기준이 다릅니다. 식품의약품안전처 「식품등의 표시기준」을 직접 확인해 주세요. 내용의 정확성은 판매자 책임이며, 값을 비운 항목은 인쇄되지 않습니다.
                </Notice>
              </>
            )}
          </Section>

          <Section step={3} title="채울 데이터">
            <div className="flex gap-2">
              <button type="button" className={s.source === "sheet" ? "slw-primary" : "slw-btn"} onClick={() => set({ source: "sheet" })}>엑셀·표로 칸마다 다르게</button>
              <button type="button" className={s.source === "same" ? "slw-primary" : "slw-btn"} onClick={() => set({ source: "same" })}>같은 내용 여러 장</button>
            </div>
            {s.source === "sheet" ? (
              <>
                <p className="text-[13px] text-slate-700">지금 표: <b>{dataName}</b> · 열 {data.headers.join(", ")}</p>
                <div className="flex flex-wrap gap-2">
                  <label className="slw-btn cursor-pointer">
                    <FileSpreadsheet size={14} /> 엑셀·CSV 열기
                    <input type="file" accept={ACCEPT_SHEETS} className="hidden" onChange={(e) => { void onFile(e.target.files?.[0]); e.target.value = ""; }} />
                  </label>
                  <button type="button" className="slw-btn" onClick={() => saveBlob("라벨_예시표.xlsx", sampleWorkbook(SAMPLE_HEADERS, SAMPLE_ROWS))}>
                    <Download size={14} /> 예시 표 받기
                  </button>
                </div>
                <textarea className="slw-field min-h-[70px] font-mono text-[12px]" placeholder="또는 엑셀에서 열 이름 줄부터 복사해 여기에 붙여 넣으세요" value={paste} onChange={(e) => setPaste(e.target.value)} />
                <button type="button" className="slw-btn" disabled={!paste.trim()} onClick={applyPaste}>붙여 넣은 표 쓰기</button>
              </>
            ) : (
              <NumberField label="인쇄할 라벨 수" value={s.sameCount} step={1} min={1} onChange={(n) => set({ sameCount: Math.max(1, Math.round(n)) })} />
            )}
            {error && <Notice tone="warn">{error}</Notice>}
          </Section>

          <Section step={4} title="인쇄 설정">
            <div className="grid grid-cols-2 gap-2">
              <NumberField label="시작 칸(쓰다 남은 라벨지)" value={s.startCell + 1} step={1} min={1} onChange={(n) => set({ startCell: Math.max(0, Math.min(per - 1, Math.round(n) - 1)) })} />
              <NumberField label="한 내용당 장수" value={s.copies} step={1} min={1} onChange={(n) => set({ copies: Math.max(1, Math.min(100, Math.round(n))) })} />
              <NumberField label="위치 보정 → 오른쪽(mm)" value={s.dx} onChange={(n) => set({ dx: n })} />
              <NumberField label="위치 보정 ↓ 아래(mm)" value={s.dy} onChange={(n) => set({ dy: n })} />
            </div>
            <label className="flex items-center gap-2 text-[13px] text-slate-700">
              <input type="checkbox" checked={s.showBorder} onChange={(e) => set({ showBorder: e.target.checked })} /> 칸 테두리 함께 인쇄(시험 인쇄용 — 라벨지에 실제 인쇄할 때는 끄세요)
            </label>
            <button type="button" className="slw-primary w-full" disabled={!pages.length} onClick={() => window.print()}>
              <Printer size={16} /> {pages.length ? `${pages.length}장 인쇄하기` : "인쇄할 내용이 없습니다"}
            </button>
            <Notice tone="tip">
              💡 인쇄 창에서 <b>배율 100%(실제 크기)</b>, <b>여백 없음</b>, 「머리글·바닥글」 끄기를 고르세요. 「맞춤」이나 「페이지에 맞게」를 고르면 칸 위치가 어긋납니다. PDF로 저장하려면 대상에서 「PDF로 저장」을 고르면 됩니다.
            </Notice>
          </Section>
        </div>

        <div className="lg:sticky lg:top-4 lg:self-start">
          <div className="slw-card p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-extrabold text-slate-900">미리보기 {pages.length ? `${page + 1} / ${pages.length}장` : ""}</p>
              <div className="flex gap-1.5">
                <button type="button" className="slw-btn" disabled={page <= 0} onClick={() => setPreviewPage(page - 1)}>이전</button>
                <button type="button" className="slw-btn" disabled={page >= pages.length - 1} onClick={() => setPreviewPage(page + 1)}>다음</button>
              </div>
            </div>
            <p className="mb-2 text-[12px] text-slate-600">빗금 칸은 건너뜁니다. 미리보기의 칸을 누르면 그 칸부터 인쇄를 시작합니다.</p>
            <div ref={wrapRef} className="w-full overflow-hidden rounded-lg bg-slate-200 p-0">
              <div style={{ width: 210 * MM_PX * scale, height: 297 * MM_PX * scale }}>
                <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", width: "210mm", boxShadow: "0 2px 10px rgba(0,0,0,.15)" }}>
                  <LabelPage
                    sheet={sheet}
                    rects={rects}
                    cells={pages[page] ?? Array(per).fill(null)}
                    template={s.template}
                    showBorder
                    startCell={page === 0 ? s.startCell : undefined}
                    onCellClick={page === 0 ? (i) => set({ startCell: i }) : undefined}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {mounted &&
        createPortal(
          <div className="label-print-root" aria-hidden>
            {pages.map((cells, i) => (
              <LabelPage key={i} sheet={sheet} rects={rects} cells={cells} template={s.template} showBorder={s.showBorder} />
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}
