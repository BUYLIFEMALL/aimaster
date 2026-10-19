"use client";

import { useEffect, useRef, useState } from "react";
import { previewCoupangShare } from "./web-actions";
import { MAX_COUPANG_SHARE_LENGTH, parseCoupangShareCode, readCoupangShare } from "@/threads-content-ops/lib/coupangLinks";

type Input = { title: string; shareCode: string; summary: string };
const fieldClass = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400";

export default function CoupangManualRegistration({ busy, onRegister }: {
  busy: boolean; onRegister: (input: Input) => Promise<boolean>;
}) {
  const [title, setTitle] = useState("");
  const [shareCode, setShareCode] = useState("");
  const [summary, setSummary] = useState("");
  const [preview, setPreview] = useState<{ name?: string; imageUrl?: string; warning?: string } | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const autoTitle = useRef("");
  const submitting = useRef(false);

  const paste = (value: string) => {
    setShareCode(value);
    const name = parseCoupangShareCode(value)?.name?.slice(0, 200) ?? "";
    const previousAutoTitle = autoTitle.current;
    setTitle(previous => !previous.trim() || previous === previousAutoTitle ? name : previous);
    autoTitle.current = name;
  };

  useEffect(() => {
    let active = true;
    setPreview(null);
    setChecking(false);
    setError("");
    if (!shareCode.trim()) return;
    let parsed;
    try { parsed = readCoupangShare(shareCode); }
    catch (err) { setError(err instanceof Error ? err.message : "제휴 링크를 확인해 주세요."); return; }
    setPreview({ name: parsed.name, imageUrl: parsed.imageUrl });
    if (!parsed.bannerUrl) return;
    setChecking(true);
    const timer = setTimeout(() => {
      void previewCoupangShare(shareCode).then(result => {
        if (!active) return;
        if (result.ok) setPreview({ name: result.name, imageUrl: result.imageUrl, warning: result.warning });
        else setError(result.error);
      }).catch(() => {
        if (active) setPreview({ name: parsed.name, warning: "사진을 확인하지 못했습니다. 상품명·링크는 등록할 수 있습니다." });
      }).finally(() => { if (active) setChecking(false); });
    }, 400);
    return () => { active = false; clearTimeout(timer); };
  }, [shareCode]);

  const register = async () => {
    if (submitting.current || busy) return;
    try { readCoupangShare(shareCode); }
    catch (err) { setError(err instanceof Error ? err.message : "제휴 링크를 확인해 주세요."); return; }
    if (!title.trim()) { setError("상품명을 입력하거나 상품명이 포함된 블로그용 HTML을 붙여넣어 주세요."); return; }
    submitting.current = true;
    try {
      if (await onRegister({ title, shareCode, summary })) {
        setTitle(""); setShareCode(""); setSummary(""); autoTitle.current = "";
      }
    } finally { submitting.current = false; }
  };

  return <section className="space-y-3 rounded-lg border border-dashed border-neutral-300 bg-white p-4" aria-label="쿠팡 API 키 없이 상품 직접 등록">
    <h4 className="text-sm font-bold text-neutral-900">🛒 쿠팡 API키가 없는 경우 직접 등록방법</h4>
    <p className="text-xs text-neutral-600">쿠팡파트너스의 제휴 링크로 상품을 등록할 수 있습니다. 블로그용 HTML을 넣으면 상품명·사진을 자동으로 채웁니다.</p>
    <ol className="space-y-1.5 rounded-md bg-amber-50 p-3 text-xs leading-relaxed text-neutral-800">
      <li><b>1단계.</b> <a href="https://partners.coupang.com/#affiliate/ws/link" target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline">쿠팡파트너스 링크 생성 화면</a>에서 상품을 찾아 <b>[링크 생성]</b>을 누릅니다.</li>
      <li><b>2단계.</b> 화면 아래 <b>[이미지 + 텍스트]</b> 영역에서 <b>블로그용 태그</b>를 선택합니다.</li>
      <li><b>3단계.</b> <b>[HTML 복사]</b> 버튼을 누릅니다.</li>
      <li><b>4단계.</b> 아래 <b>링크·HTML 입력칸</b>에 붙여넣으면 상품명·사진이 자동 채워집니다.</li>
      <li><b>5단계.</b> 내용을 확인한 뒤 <b>[상품 등록]</b>을 누릅니다.</li>
      <li className="pt-1 text-neutral-600">※ 일반 쿠팡 쇼핑 주소(coupang.com/vp/products/…)는 등록되지 않습니다. 링크만 넣는 경우 상품명을 직접 입력해 주세요.</li>
    </ol>
    <label className="block"><span className="mb-1 block text-sm font-semibold text-neutral-800">상품명</span><input className={fieldClass} maxLength={200} value={title} disabled={busy} onChange={e => setTitle(e.target.value)} placeholder="상품명 (HTML 코드를 넣으면 자동 입력)" /></label>
    <label className="block"><span className="mb-1 block text-sm font-semibold text-neutral-800">쿠팡 제휴 링크·블로그용 HTML</span><textarea className={`${fieldClass} min-h-20 resize-y`} maxLength={MAX_COUPANG_SHARE_LENGTH} value={shareCode} disabled={busy} onChange={e => paste(e.target.value)} placeholder={'<a href="https://link.coupang.com/a/..."><img src="..." alt="상품명"></a>'} /></label>
    {checking && <p className="text-xs text-neutral-600" role="status">코드에서 상품 사진을 만드는 중…</p>}
    {preview && <div className="flex items-center gap-3 text-xs text-neutral-700" role="status">
      {preview.imageUrl && <img src={preview.imageUrl} alt="상품 사진 미리보기" referrerPolicy="no-referrer" className="h-16 w-16 rounded-lg border border-neutral-200 object-cover" />}
      <span>✓ 제휴 링크 확인됨{preview.name ? `: ${preview.name}` : ""}{!preview.imageUrl && !checking ? " (사진 없음 — 블로그용 HTML을 넣으면 사진도 가져옵니다)" : ""}</span>
    </div>}
    {preview?.warning && <p className="text-xs text-amber-800">{preview.warning}</p>}
    <label className="block"><span className="mb-1 block text-sm font-semibold text-neutral-800">메모 (선택)</span><textarea className={`${fieldClass} min-h-16 resize-y`} maxLength={1000} value={summary} disabled={busy} onChange={e => setSummary(e.target.value)} placeholder="초안에 꼭 넣고 싶은 핵심 내용, 강조점, 주의사항을 적어 두세요." /></label>
    <button type="button" disabled={busy || checking || !shareCode.trim() || !title.trim() || Boolean(error)} onClick={() => void register()} className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300 disabled:text-neutral-700">{busy ? "상품 등록 중…" : "상품 등록"}</button>
    {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
  </section>;
}
