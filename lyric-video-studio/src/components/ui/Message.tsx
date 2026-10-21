"use client";
import { Loader2 } from "lucide-react";
import type { Msg } from "./api";

export function Message({ msg }: { msg: Msg }) {
  if (!msg) return null;
  return <div role="status" className={`notice ${msg.ok ? "success" : "error-box"}`}>{msg.text}{msg.needKey && <> <a href="/settings" style={{ textDecoration: "underline", fontWeight: 700 }}>🔑 API키등록·플랫폼연동으로 이동 →</a></>}</div>;
}

export function Busy({ on, label }: { on: boolean; label: string }) {
  return on ? <span className="row muted" style={{ fontSize: 12 }}><Loader2 size={14} className="spin" />{label}</span> : null;
}
