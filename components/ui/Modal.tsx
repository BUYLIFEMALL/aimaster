"use client";

import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  className,
}: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

      {/* 내용이 화면보다 길면 이 바깥 영역이 스크롤된다(2026-10-24 — 긴 가이드 수정 창이 아래로 내려가지 않던 문제) */}
      <div
        ref={overlayRef}
        className="relative flex min-h-full items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === overlayRef.current) onClose();
        }}
      >
      {/* Modal */}
      <div
        className={cn(
          "relative w-full glass-card rounded-2xl my-4",
          sizeClasses[size],
          className
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h3 className="text-lg font-bold text-white">{title}</h3>
            <button
              onClick={onClose}
              className="text-subtext hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            >
              <X size={20} />
            </button>
          </div>
        )}
        {!title && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-subtext hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10 z-10"
          >
            <X size={20} />
          </button>
        )}
        <div className={cn(!title && "pt-2")}>{children}</div>
      </div>
      </div>
    </div>
  );
}
