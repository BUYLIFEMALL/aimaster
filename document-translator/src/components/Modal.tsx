"use client";
import { useEffect, useId, useRef } from "react";
export function Modal({
  open,
  title,
  close,
  children,
}: {
  open: boolean;
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      className="modal"
      ref={ref}
      aria-labelledby={id}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="dialog-body">
        <header className="modal-header">
          <h2 id={id}>{title}</h2>
          <button aria-label="닫기" onClick={close}>
            ×
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
