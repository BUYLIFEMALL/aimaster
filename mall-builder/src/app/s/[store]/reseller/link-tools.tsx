"use client";

import { useState } from "react";
import QRCode from "qrcode";

// M4-C2 리셀러 링크 도구 — 링크 복사 + QR 보기(그림 저장 가능). QR은 브라우저에서 바로 만든다(서버·외부 호출 없음)
export default function LinkTools({ url, name, compact = false }: { url: string; name: string; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const [qr, setQr] = useState<string | null>(null);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const t = document.createElement("textarea");
      t.value = url;
      document.body.appendChild(t);
      t.select();
      document.execCommand("copy");
      t.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const showQr = async () => setQr(qr ? null : await QRCode.toDataURL(url, { width: 320, margin: 1 }));
  const btn = "min-h-9 rounded-lg border px-2.5 py-1 text-xs";
  return (
    <div className={compact ? "" : "rounded-xl border bg-white p-3"} data-link-tools>
      {!compact && <p className="break-all font-mono text-xs text-slate-600" data-link-url>{url}</p>}
      <div className={`flex flex-wrap gap-1.5 ${compact ? "" : "mt-2"}`}>
        <button type="button" onClick={copy} className={`${btn} ${copied ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "bg-white"}`} data-copy-link>
          {copied ? "복사됨" : "링크 복사"}
        </button>
        <button type="button" onClick={showQr} className={`${btn} bg-white`} data-show-qr>
          {qr ? "QR 닫기" : "QR"}
        </button>
      </div>
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
