"use client";

import { useEffect, useState } from "react";
import { EMPTY_NOTICE, NOTICE_FIELDS, NOTICE_STORE_KEY, noticeRows, normalizeNotice, wrapText, type ShippingNotice } from "@/lib/detailBlocks";

// v1.37(E3, 2026-10-26): 배송·교환·환불 안내 — 한 번 입력하면 이 브라우저에만 기억(localStorage, 서버 저장 없음, 주인님 결정 ①).
// HTML 블록 편집기의 「🚚 배송·교환 안내 넣기」가 이 값을 쓰고, 여기서는 860px 안내 이미지(PNG)를 바로 받을 수 있다.

function load(): ShippingNotice {
  try { return normalizeNotice(JSON.parse(localStorage.getItem(NOTICE_STORE_KEY) ?? "null")); } catch { return { ...EMPTY_NOTICE }; }
}

/** 860px 안내 이미지 — 브라우저 캔버스로 그림(기기 한글 글꼴) */
function renderNoticePng(n: ShippingNotice): Promise<Blob> {
  const W = 860, PAD = 40, KEYW = 210, GAP = 16, LINE = 30;
  const font = "'Pretendard','Apple SD Gothic Neo','Malgun Gothic','Noto Sans KR',sans-serif";
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.font = `16px ${font}`;
  const rows = noticeRows(n).map(([k, v]) => ({ k, lines: wrapText(v, W - PAD * 2 - KEYW - GAP * 2, (s) => probe.measureText(s).width) }));
  const H = PAD + 60 + rows.reduce((h, r) => h + r.lines.length * LINE + GAP * 2, 0) + PAD;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d")!;
  x.fillStyle = "#ffffff"; x.fillRect(0, 0, W, H);
  x.fillStyle = "#0f172a"; x.font = `800 26px ${font}`; x.textBaseline = "top";
  x.fillText("🚚 배송 · 교환 · 환불 안내", PAD, PAD);
  let y = PAD + 60;
  for (const r of rows) {
    const h = r.lines.length * LINE + GAP * 2;
    x.fillStyle = "#f8fafc"; x.fillRect(PAD, y, KEYW, h);
    x.strokeStyle = "#e2e8f0"; x.lineWidth = 1; x.strokeRect(PAD + 0.5, y + 0.5, W - PAD * 2 - 1, h - 1);
    x.beginPath(); x.moveTo(PAD + KEYW + 0.5, y); x.lineTo(PAD + KEYW + 0.5, y + h); x.stroke();
    x.fillStyle = "#334155"; x.font = `700 16px ${font}`; x.fillText(r.k, PAD + GAP, y + GAP + 4);
    x.fillStyle = "#1e293b"; x.font = `16px ${font}`;
    r.lines.forEach((l, i) => x.fillText(l, PAD + KEYW + GAP, y + GAP + 4 + i * LINE));
    y += h;
  }
  return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error("이미지를 만들지 못했습니다."))), "image/png"));
}

export function ShippingNoticeCard() {
  const [n, setN] = useState<ShippingNotice>(EMPTY_NOTICE);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => { setN(load()); }, []);

  function save(next: ShippingNotice) {
    setN(next);
    try { localStorage.setItem(NOTICE_STORE_KEY, JSON.stringify(next)); } catch { setMsg("이 브라우저에 저장하지 못했습니다(사생활 보호 창 등). 지금 화면에서는 그대로 쓸 수 있습니다."); }
  }

  async function downloadPng() {
    if (!noticeRows(n).length) { setMsg("한 칸 이상 채워 주세요."); return; }
    const blob = await renderNoticePng(n);
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "배송교환안내_860px.png"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    setMsg("✅ 860px 안내 이미지를 받았습니다. 「📤 직접 등록」으로 섹션에 넣거나 마켓 편집기에 올려 쓰세요.");
  }

  return (
    <details className="mt-6 rounded-2xl border border-slate-200/90 bg-slate-50 p-4 sm:p-5">
      <summary className="cursor-pointer text-sm font-black text-slate-900">🚚 배송·교환·환불 안내 <span className="text-xs font-semibold text-slate-500">— 한 번 입력하면 이 브라우저에 기억</span></summary>
      <p className="text-xs text-slate-500 mt-2">입력한 칸만 안내에 들어갑니다. 회원님 PC의 이 브라우저에만 저장되고 서버로 보내지 않습니다(다른 PC·브라우저에서는 다시 입력).</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
        {NOTICE_FIELDS.map((f) => (
          <label key={f.key} className={`text-[11px] font-bold text-slate-600 ${f.multiline ? "sm:col-span-2" : ""}`}>
            {f.label}
            {f.multiline
              ? <textarea value={n[f.key]} placeholder={f.placeholder} maxLength={300} rows={2} onChange={(e) => save({ ...n, [f.key]: e.target.value })} className="mt-1 w-full text-xs font-normal rounded-lg border border-slate-200 bg-white px-2.5 py-2" />
              : <input value={n[f.key]} placeholder={f.placeholder} maxLength={300} onChange={(e) => save({ ...n, [f.key]: e.target.value })} className="mt-1 w-full text-xs font-normal rounded-lg border border-slate-200 bg-white px-2.5 py-2" />}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mt-3">
        <button type="button" onClick={() => void downloadPng()} className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg px-3 py-2">🖼 860px 안내 이미지 받기</button>
        <button type="button" onClick={() => save({ ...EMPTY_NOTICE })} className="text-xs font-bold text-slate-500 hover:text-slate-800 px-2 py-2">모두 지우기</button>
      </div>
      <p className="text-[11px] text-slate-500 mt-2">HTML 상세페이지에는 아래 「✏️ 블록 편집」의 「🚚 배송·교환 안내 넣기」로 넣습니다.</p>
      {msg && <p role="status" className="text-[11px] font-bold text-indigo-700 bg-indigo-50 rounded-lg px-2.5 py-1.5 mt-2">{msg}</p>}
    </details>
  );
}
