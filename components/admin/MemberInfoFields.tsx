"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { formatPhoneNumber } from "@/lib/utils/format";

interface Props {
  memberId: string;
  name: string | null;
  email: string;
  phone: string | null;
}

/** 관리자 회원 상세 — 이름·이메일·핸드폰 표시와 수정(잘못 입력한 회원 정보 바로잡기, 2026-10-19 주인님 지시) */
export default function MemberInfoFields({ memberId, name, email, phone }: Props) {
  const router = useRouter();
  const [info, setInfo] = useState({ name, email, phone });
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: name ?? "", email, phone: phone ?? "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  function startEdit() {
    setForm({ name: info.name ?? "", email: info.email, phone: info.phone ?? "" });
    setMessage(null);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: memberId, ...form }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ text: data.error ?? "저장하지 못했습니다.", ok: false });
        return;
      }
      setInfo({ name: data.member.name, email: data.member.email, phone: data.member.phone });
      setEditing(false);
      setMessage({ text: data.emailChanged ? "저장했습니다. 이 회원은 이제 새 이메일로 로그인합니다." : "저장했습니다.", ok: true });
      router.refresh();
    } catch {
      setMessage({ text: "서버에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.", ok: false });
    } finally {
      setSaving(false);
    }
  }

  const inputCls = "mt-1 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-white focus:border-gold focus:outline-none";

  if (editing) {
    return (
      <div className="md:col-span-2 space-y-3 rounded-xl border border-gold/30 bg-white/5 p-4" aria-label="회원 정보 수정">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <label className="text-subtext">이름
            <input className={inputCls} value={form.name} maxLength={50} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </label>
          <label className="text-subtext">이메일
            <input className={inputCls} type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </label>
          <label className="text-subtext">핸드폰
            <input className={inputCls} inputMode="tel" value={form.phone} placeholder="010-1234-5678 (비우면 미등록)" onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </label>
        </div>
        {form.email.trim().toLowerCase() !== info.email.toLowerCase() && (
          <p className="text-xs text-amber-300">⚠️ 이메일을 바꾸면 이 회원의 로그인 아이디가 확인 메일 없이 바로 바뀝니다. 회원에게 새 이메일로 로그인하도록 알려 주세요.</p>
        )}
        {message && !message.ok && <p role="alert" className="text-xs text-red-400">{message.text}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={save} disabled={saving} className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-black disabled:opacity-50">
            {saving ? "저장 중…" : "저장"}
          </button>
          <button type="button" onClick={() => { setEditing(false); setMessage(null); }} disabled={saving} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-subtext hover:text-white">
            취소
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div>
        <span className="text-subtext">이름</span>
        <p className="text-white font-medium">{info.name ?? "(이름 없음)"}</p>
      </div>
      <div>
        <span className="text-subtext">이메일</span>
        <p className="text-white font-medium">{info.email}</p>
      </div>
      <div>
        <span className="text-subtext">핸드폰</span>
        <p className={info.phone ? "text-white font-medium" : "text-red-400 font-medium"}>{info.phone ? formatPhoneNumber(info.phone) : "미등록 (프로그램 이용 불가)"}</p>
      </div>
      <div className="flex items-end">
        <button type="button" onClick={startEdit} className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 px-3 py-1.5 text-xs font-semibold text-gold hover:bg-gold/10">
          <Pencil size={13} /> 이름·이메일·핸드폰 수정
        </button>
      </div>
      {message?.ok && <p role="status" className="md:col-span-2 text-xs text-green-400">{message.text}</p>}
    </>
  );
}
