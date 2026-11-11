"use client";

// D32 앱(PWA) — 서비스 워커 등록(모든 손님) + 「📲 홈 화면에 추가」 안내 띠(승인 사업자 손님만, 닫으면 30일 숨김·이 기기 저장)
import { useEffect, useState } from "react";
import { INSTALL_HIDE_DAYS } from "@/lib/pwa";

type BeforeInstall = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const KEY = "mb-install-hidden-until";

export default function PwaPrompt({ storeName, offer }: { storeName: string; offer: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstall | null>(null);
  const [show, setShow] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    if (!offer) return;
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    let hidden = false;
    try {
      hidden = Number(localStorage.getItem(KEY) ?? 0) > Date.now();
    } catch {}
    if (standalone || hidden) return;
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIos(isIos);
    if (isIos) setShow(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstall);
      setShow(true);
    };
    // 화면이 그려지기 전에 온 신호는 머리의 작은 스크립트(EARLY_INSTALL_SCRIPT)가 붙잡아 둔다
    const early = (window as { __mbInstall?: Event }).__mbInstall;
    if (early) onPrompt(early);
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, [offer]);

  const hide = () => {
    try {
      localStorage.setItem(KEY, String(Date.now() + INSTALL_HIDE_DAYS * 86400_000));
    } catch {}
    setShow(false);
  };
  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => null);
    setDeferred(null);
    setShow(false);
  };

  if (!show) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 px-4 py-3 shadow-lg backdrop-blur" data-install-banner>
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 text-sm">
        <span className="text-lg">📲</span>
        <span className="flex-1">
          「<b>{storeName}</b>」 앱을 홈 화면에 추가하면 바로 열어 재주문할 수 있습니다.
          {ios && <span className="block text-xs text-gray-600">아이폰: 아래 <b>공유 버튼(□↑)</b> → <b>「홈 화면에 추가」</b>를 눌러 주세요.</span>}
        </span>
        {!ios && deferred && <button type="button" onClick={install} className="min-h-11 rounded bg-gray-900 px-4 py-2 text-white" data-install-button>홈 화면에 추가</button>}
        <button type="button" onClick={hide} className="min-h-11 px-3 py-2 text-gray-500" aria-label="안내 닫기">닫기</button>
      </div>
    </div>
  );
}
