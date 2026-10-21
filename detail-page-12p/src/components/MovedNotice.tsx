"use client";

import { useEffect, useState } from "react";
import { APP_VERSION } from "@/lib/version";

// v1.10(2026-10-21, 이커머스 병합 E1): 이 프로그램은 「AI 상세페이지 자동화」로 합쳐졌다.
// 12단 결과는 이 주소의 브라우저 저장소(localStorage)에만 있으므로, 여기서 백업 파일을 내려받아
// 15p 「12단 자료 가져오기」에 올리게 한다. 저장 키는 DetailPageApp.tsx의 STORAGE_KEY와 같다.
const STORAGE_KEY = "aimaster_detail_12p_projects_v2";
const SAMPLE_PROJECT_ID = "sample-titanium-firepit-12p";
const TARGET_URL = "https://shop-detail-page.buylife.xyz/products/import";

export function MovedNotice({ userEmail }: { userEmail?: string | null }) {
  const [raw, setRaw] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      const real = Array.isArray(parsed) ? parsed.filter((p: { id?: string }) => p?.id !== SAMPLE_PROJECT_ID) : [];
      setRaw(real.length > 0 ? JSON.stringify(real, null, 2) : null);
      setCount(real.length);
    } catch {
      setRaw(null);
    } finally {
      setLoaded(true);
    }
  }, []);

  function download() {
    if (!raw) return;
    const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `detail_page_12p_backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-2xl shadow-sm p-6 sm:p-8 space-y-5">
        <div className="text-center space-y-2">
          <div className="text-4xl">📦</div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900">AI 12단 상세페이지가 「AI 상세페이지 자동화」로 합쳐졌습니다</h1>
          <p className="text-sm text-slate-600 leading-relaxed">
            쿠팡 12단·스마트스토어 9단 규격, 사양서 분석, 모바일 미리보기를 이제 AI 상세페이지 자동화에서 쓰실 수 있습니다.
            새로 만든 결과는 브라우저가 아니라 서버에 안전하게 보관됩니다.
          </p>
          <p className="text-[11px] text-slate-400">{APP_VERSION}{userEmail ? ` · ${userEmail}` : ""}</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <h2 className="text-sm font-bold text-slate-900">1. 이 브라우저에 저장된 12단 자료 내려받기</h2>
          {!loaded ? (
            <p className="text-xs text-slate-500">확인 중...</p>
          ) : raw ? (
            <>
              <p className="text-xs text-slate-600">이 브라우저에 12단 프로젝트 {count}개가 있습니다.</p>
              <button
                type="button"
                onClick={download}
                className="w-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl py-2.5"
              >
                ⬇️ 내 12단 자료 백업 내려받기 (JSON)
              </button>
            </>
          ) : (
            <p className="text-xs text-slate-600">
              이 브라우저에는 옮길 12단 자료가 없습니다. 다른 컴퓨터·브라우저에서 쓰셨다면 그 브라우저에서 이 주소를 열어 주세요.
            </p>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
          <h2 className="text-sm font-bold text-slate-900">2. AI 상세페이지 자동화에서 가져오기</h2>
          <p className="text-xs text-slate-600">받은 파일을 「12단 자료 가져오기」 화면에 올리면 상품과 장면 이미지가 옮겨집니다(요금 없음).</p>
          <a
            href={TARGET_URL}
            className="block w-full text-center text-sm font-bold text-blue-700 bg-white border border-blue-200 hover:border-blue-400 rounded-xl py-2.5"
          >
            AI 상세페이지 자동화 열기 →
          </a>
        </div>
      </div>
    </main>
  );
}
