"use client";

import { useState } from "react";

interface Props {
  pageId: string;
  html: string;
}

export default function ExportButton({ pageId, html }: Props) {
  const [exportingImage, setExportingImage] = useState(false);

  async function handleExportImage() {
    setExportingImage(true);
    try {
      const res = await fetch("/api/export-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: pageId }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "이미지 생성에 실패했습니다.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "상세페이지.png";
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExportingImage(false);
    }
  }

  function handleDownloadHtml() {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "상세페이지.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <button
        onClick={handleDownloadHtml}
        className="flex-1 bg-gray-700 hover:bg-gray-900 text-white font-semibold py-3 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        <span>📄</span> HTML 다운로드
      </button>
      <button
        onClick={handleExportImage}
        disabled={exportingImage}
        className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-60 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        {exportingImage ? (
          <>
            <span className="animate-spin">⏳</span> 이미지 생성 중...
          </>
        ) : (
          <>
            <span>🖼️</span> 긴 이미지 다운로드
          </>
        )}
      </button>
    </div>
  );
}
