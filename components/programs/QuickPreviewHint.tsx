"use client";

import { useEffect, useState } from "react";
import { Eye, X } from "lucide-react";

// 휴대폰 첫 방문 안내(2026-10-20): 카드 아래 눈 아이콘 = 퀵 프리뷰. 닫으면 그 기기에서는 다시 띄우지 않는다.
// ProgramCard마다 렌더되지만 화면에 처음 올라온 카드 하나만 안내를 띄운다(나머지는 null).
const STORAGE_KEY = "aimaster.quickPreviewHint.dismissed";
let claimed = false;

export default function QuickPreviewHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (claimed) return;
    claimed = true;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true);
    } catch {
      // 저장소를 못 쓰는 환경(사생활 보호 모드 등)에서는 안내를 띄우지 않는다.
    }
    return () => {
      claimed = false;
    };
  }, []);

  if (!show) return null;

  const dismiss = () => {
    setShow(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // 무시
    }
  };

  return (
    <div className="md:hidden fixed bottom-4 left-4 right-4 z-50 flex items-center gap-3 rounded-2xl border border-gold/40 bg-slate-950/95 px-4 py-3 text-sm text-white shadow-2xl shadow-black/50 backdrop-blur-md">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-gold/40 text-gold">
        <Eye size={16} />
      </span>
      <p className="flex-1 leading-snug">
        카드 아래 <b className="text-gold">눈 아이콘</b>을 누르면 프로그램을 미리 볼 수 있어요.
      </p>
      <button type="button" onClick={dismiss} aria-label="안내 닫기" className="shrink-0 rounded-lg p-1.5 text-white/70 hover:text-white">
        <X size={16} />
      </button>
    </div>
  );
}
