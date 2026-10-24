"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import JSZip from "jszip";
import { ArrowDown, ArrowUp, ArrowDownAZ, Download, Trash2 } from "lucide-react";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { Dropzone } from "@/components/ui/Dropzone";
import { DEFAULT_RENAME, buildNames, moveItem, type RenameOptions } from "@/lib/rename";
import { loadLocal, saveBlob, saveLocal } from "@/lib/download";

const STORE_KEY = "sld-rename-v1";
const MAX_FILES = 500;

interface Item {
  id: string;
  file: File;
  url: string | null;
}

export default function RenameTool() {
  const [items, setItems] = useState<Item[]>([]);
  const [opts, setOpts] = useState<RenameOptions>(DEFAULT_RENAME);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    setOpts(loadLocal(STORE_KEY, DEFAULT_RENAME));
    setMounted(true);
  }, []);
  useEffect(() => {
    if (mounted) saveLocal(STORE_KEY, opts);
  }, [opts, mounted]);
  // 화면을 떠날 때 미리보기 주소를 정리한다(최신 목록 기준)
  const itemsRef = useRef<Item[]>([]);
  itemsRef.current = items;
  useEffect(() => () => itemsRef.current.forEach((it) => it.url && URL.revokeObjectURL(it.url)), []);

  const names = useMemo(() => buildNames(items.map((i) => i.file.name), opts), [items, opts]);
  const set = (patch: Partial<RenameOptions>) => setOpts((p) => ({ ...p, ...patch }));

  function addFiles(files: File[]) {
    const room = MAX_FILES - items.length;
    const take = files.slice(0, Math.max(0, room));
    setNotice(files.length > take.length ? `한 번에 ${MAX_FILES}개까지 넣을 수 있어 ${files.length - take.length}개는 빠졌습니다.` : null);
    setItems((prev) => [
      ...prev,
      ...take.map((file, i) => ({ id: `${Date.now()}-${i}-${file.name}`, file, url: file.type.startsWith("image/") ? URL.createObjectURL(file) : null })),
    ]);
  }

  function remove(id: string) {
    setItems((prev) => {
      const it = prev.find((x) => x.id === id);
      if (it?.url) URL.revokeObjectURL(it.url);
      return prev.filter((x) => x.id !== id);
    });
  }

  function sortByName() {
    setItems((prev) => prev.slice().sort((a, b) => a.file.name.localeCompare(b.file.name, "ko", { numeric: true })));
  }

  async function downloadZip() {
    setBusy(true);
    try {
      const zip = new JSZip();
      items.forEach((it, i) => zip.file(names[i], it.file, { date: new Date(it.file.lastModified) }));
      const blob = await zip.generateAsync({ type: "blob", compression: "STORE" });
      saveBlob(`${opts.base || "파일"}_이름변경_${items.length}개.zip`, blob);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader emoji="🗂" title="파일명 일괄 변경" description="여러 파일의 이름을 「공통 이름 + 순번」으로 한 번에 바꿔 ZIP으로 저장합니다." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="slw-card space-y-3 p-4 lg:self-start">
          <Dropzone accept="*/*" label="파일을 끌어 놓거나 눌러서 고르세요" hint={`사진·문서 무엇이든 · 최대 ${MAX_FILES}개`} onFiles={addFiles} />
          <label className="block">
            <span className="slw-label">공통 이름</span>
            <input className="slw-field" value={opts.base} onChange={(e) => set({ base: e.target.value })} placeholder="예: 사과즙_상세" />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="slw-label">시작 번호</span>
              <input type="number" min={0} className="slw-field" value={opts.start} onChange={(e) => set({ start: Number(e.target.value) || 0 })} />
            </label>
            <label className="block">
              <span className="slw-label">자릿수</span>
              <select className="slw-field" value={opts.digits} onChange={(e) => set({ digits: Number(e.target.value) })}>
                {[1, 2, 3, 4].map((d) => <option key={d} value={d}>{d}자리 ({"1".padStart(d, "0")})</option>)}
              </select>
            </label>
            <label className="block">
              <span className="slw-label">구분 글자</span>
              <select className="slw-field" value={opts.separator} onChange={(e) => set({ separator: e.target.value })}>
                <option value="_">밑줄 _</option>
                <option value="-">하이픈 -</option>
                <option value=" ">띄어쓰기</option>
                <option value="">없음</option>
              </select>
            </label>
            <label className="block">
              <span className="slw-label">순번 위치</span>
              <select className="slw-field" value={opts.position} onChange={(e) => set({ position: e.target.value as RenameOptions["position"] })}>
                <option value="after">이름 뒤</option>
                <option value="before">이름 앞</option>
              </select>
            </label>
          </div>
          <label className="flex items-center gap-2 text-[13px] text-slate-700">
            <input type="checkbox" checked={opts.lowerExt} onChange={(e) => set({ lowerExt: e.target.checked })} /> 확장자 소문자로(.JPG → .jpg)
          </label>
          <button type="button" className="slw-primary w-full" disabled={!items.length || busy} onClick={() => void downloadZip()}>
            <Download size={15} /> {busy ? "ZIP 만드는 중…" : `${items.length}개 ZIP으로 저장`}
          </button>
          {notice && <Notice tone="warn">{notice}</Notice>}
          <Notice>ℹ 브라우저는 내 PC의 파일 이름을 직접 바꿀 수 없어서, 새 이름으로 담은 ZIP을 드립니다. 원본 파일은 그대로 있습니다.</Notice>
        </section>

        <section className="slw-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-extrabold text-slate-900">순서 · 새 이름 미리보기 ({items.length}개)</p>
            <div className="flex gap-1.5">
              <button type="button" className="slw-btn" disabled={items.length < 2} onClick={sortByName}><ArrowDownAZ size={14} /> 원래 이름순</button>
              <button type="button" className="slw-btn" disabled={!items.length} onClick={() => { items.forEach((it) => it.url && URL.revokeObjectURL(it.url)); setItems([]); }}><Trash2 size={14} /> 모두 빼기</button>
            </div>
          </div>
          {items.length === 0 ? (
            <p className="rounded-xl bg-slate-50 p-8 text-center text-sm text-slate-600">왼쪽에 파일을 넣으면 여기에 새 이름이 바로 보입니다.</p>
          ) : (
            <ol className="divide-y divide-slate-100">
              {items.map((it, i) => (
                <li key={it.id} className="flex items-center gap-3 py-2">
                  <span className="w-7 shrink-0 text-right font-mono text-[12px] text-slate-500">{i + 1}</span>
                  {it.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.url} alt="" className="h-11 w-11 shrink-0 rounded-md border border-slate-200 object-cover" />
                  ) : (
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-100 text-lg" aria-hidden>📄</span>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-bold text-slate-900">{names[i]}</p>
                    <p className="truncate text-[12px] text-slate-500">원래: {it.file.name}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button type="button" aria-label="위로" className="slw-btn !min-h-0 !px-2 !py-1" disabled={i === 0} onClick={() => setItems((p) => moveItem(p, i, i - 1))}><ArrowUp size={14} /></button>
                    <button type="button" aria-label="아래로" className="slw-btn !min-h-0 !px-2 !py-1" disabled={i === items.length - 1} onClick={() => setItems((p) => moveItem(p, i, i + 1))}><ArrowDown size={14} /></button>
                    <button type="button" aria-label="빼기" className="slw-btn !min-h-0 !px-2 !py-1" onClick={() => remove(it.id)}><Trash2 size={14} /></button>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
