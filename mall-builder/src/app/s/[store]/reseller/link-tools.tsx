"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { makeShortLinkAction } from "@/lib/reseller-actions";

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const t = document.createElement("textarea");
    t.value = text;
    document.body.appendChild(t);
    t.select();
    document.execCommand("copy");
    t.remove();
  }
}

// M4-C2·C3 리셀러 링크 도구 — 링크 복사, 짧은 링크(처음 누를 때 만들고 복사, 누른 수 표시), QR(짧은 링크가 있으면 그것으로).
// QR은 브라우저에서 바로 만든다(서버·외부 호출 없음)
export default function LinkTools({
  url,
  name,
  compact = false,
  short,
}: {
  url: string;
  name: string;
  compact?: boolean;
  /** 짧은 링크: 몰 주소 이름·상품 id(null = 몰 첫 화면)·앞부분·이미 만든 키·누른 수 */
  short?: { slug: string; productId: string | null; base: string; key?: string | null; clicks?: number };
}) {
  const [copied, setCopied] = useState<"" | "long" | "short">("");
  const [qr, setQr] = useState<string | null>(null);
  const [key, setKey] = useState<string | null>(short?.key ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shortUrl = short && key ? short.base + key : null;
  const flash = (k: "long" | "short") => {
    setCopied(k);
    setTimeout(() => setCopied(""), 1500);
  };
  const copyLong = async () => {
    await copyText(url);
    flash("long");
  };
  const copyShort = async () => {
    if (!short) return;
    let k = key;
    if (!k) {
      setBusy(true);
      const r = await makeShortLinkAction(short.slug, short.productId);
      setBusy(false);
      if (r.error || !r.key) return setErr(r.error ?? "짧은 링크를 만들지 못했습니다.");
      k = r.key;
      setKey(k);
    }
    setErr(null);
    await copyText(short.base + k);
    flash("short");
  };
  const showQr = async () => setQr(qr ? null : await QRCode.toDataURL(shortUrl ?? url, { width: 320, margin: 1 }));
  const btn = "min-h-9 rounded-lg border px-2.5 py-1 text-xs";
  const on = "border-emerald-300 bg-emerald-50 text-emerald-800";
  return (
    <div className={compact ? "" : "rounded-xl border bg-white p-3"} data-link-tools>
      {!compact && <p className="break-all font-mono text-xs text-slate-600" data-link-url>{url}</p>}
      {shortUrl && (
        <p className={`break-all font-mono text-xs text-slate-600 ${compact ? "" : "mt-1"}`} data-short-url>
          {shortUrl}
          {short?.clicks ? <span className="ml-1 font-sans text-slate-400">· 누른 수 {short.clicks}</span> : null}
        </p>
      )}
      <div className={`flex flex-wrap gap-1.5 ${compact && !shortUrl ? "" : "mt-2"}`}>
        <button type="button" onClick={copyLong} className={`${btn} ${copied === "long" ? on : "bg-white"}`} data-copy-link>
          {copied === "long" ? "복사됨" : "링크 복사"}
        </button>
        {short && (
          <button type="button" onClick={copyShort} disabled={busy} className={`${btn} ${copied === "short" ? on : "bg-white"}`} data-copy-short>
            {busy ? "만드는 중…" : copied === "short" ? "복사됨" : "짧은 링크"}
          </button>
        )}
        <button type="button" onClick={showQr} className={`${btn} bg-white`} data-show-qr>
          {qr ? "QR 닫기" : "QR"}
        </button>
      </div>
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
      {qr && (
        <div className="mt-2 inline-block rounded-lg border bg-white p-2 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt={`${name} QR 코드`} width={160} height={160} data-qr-img />
          <a href={qr} download={`qr-${name.slice(0, 20)}.png`} className="mt-1 block text-xs text-blue-700 underline">그림 저장</a>
        </div>
      )}
    </div>
  );
}
