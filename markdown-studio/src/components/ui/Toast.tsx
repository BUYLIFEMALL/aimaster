"use client";
import { useEffect, useState } from "react";

// 2026-10-17 v1.12: 복사 등 작업 결과를 화면 오른쪽 아래에 잠깐 띄우는 알림(토스트). 어디서든 showToast()로 부른다.
type ToastItem = { id: number; message: string; tone: "success" | "error" };
const EVENT = "ms-toast";

export function showToast(message: string, tone: ToastItem["tone"] = "success") {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { message, tone } }));
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    let seq = 0;
    const onToast = (e: Event) => {
      const { message, tone } = (e as CustomEvent<{ message: string; tone: ToastItem["tone"] }>).detail;
      const id = ++seq;
      setItems(list => [...list.slice(-2), { id, message, tone }]);
      window.setTimeout(() => setItems(list => list.filter(t => t.id !== id)), 2400);
    };
    window.addEventListener(EVENT, onToast);
    return () => window.removeEventListener(EVENT, onToast);
  }, []);
  return (
    <div className="toast-stack" aria-live="polite">
      {items.map(t => (
        <div key={t.id} className={`toast ${t.tone}`} role="status">
          {t.tone === "success" ? "✅" : "⚠️"} {t.message}
        </div>
      ))}
    </div>
  );
}
