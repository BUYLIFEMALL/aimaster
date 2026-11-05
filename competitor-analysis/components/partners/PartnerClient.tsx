"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { agreePartnerNoticeAction, searchPartnersAction, saveContactAction } from "@/lib/actions/partners";
import { CHANNEL_LABELS, PARTNER_NOTICE_LINES } from "@/lib/partners/notice";

export function PartnerNotice() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function agree() {
    setPending(true); setError(null);
    try {
      const r = await agreePartnerNoticeAction();
      if (r.error) setError(r.error); else router.refresh();
    } finally { setPending(false); }
  }

  return (
    <div className="mx-card space-y-3 border-mx-danger">
      <p className="text-sm font-bold text-mx-text">⚠️ 처음 한 번 — 이용 안내와 책임</p>
      <ul className="list-disc space-y-1 pl-5 text-sm leading-relaxed text-mx-muted">
        {PARTNER_NOTICE_LINES.map((line) => <li key={line}>{line}</li>)}
      </ul>
      <label className="flex items-start gap-2 text-sm text-mx-text">
        <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        위 내용을 읽었고, 회원 본인 참고용으로 본인 책임하에 이용하는 데 동의합니다.
      </label>
      <button type="button" disabled={!checked || pending} onClick={agree} className="mx-btn-primary min-h-[44px] px-5">
        {pending ? "저장 중..." : "동의하고 시작하기"}
      </button>
      {error && <p className="text-sm text-mx-danger">{error}</p>}
    </div>
  );
}

export function PartnerSearchForm() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string; needsKey?: boolean } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true); setMessage(null);
    try {
      const r = await searchPartnersAction(new FormData(form));
      if (r.error) setMessage({ ok: false, text: r.error, needsKey: r.needsKey });
      else setMessage({ ok: true, text: `주제에 맞는 새 채널 ${r.added ?? 0}곳을 담았습니다${r.skipped ? ` · 이미 있던 ${r.skipped}곳은 건너뜀` : ""}${r.unmatched ? ` · 주제와 맞지 않는 ${r.unmatched}곳은 버림` : ""}.` });
      router.refresh();
    } finally { setPending(false); }
  }

  return (
    <form onSubmit={onSubmit} className="mx-card space-y-3">
      <p className="text-sm font-bold text-mx-text">🔎 키워드로 채널 찾기</p>
      <div className="flex flex-wrap gap-2">
        <input name="keyword" required maxLength={60} placeholder="주제 키워드 (예: 공동구매)" className="input min-w-[200px] flex-1" />
        <button type="submit" disabled={pending} className="mx-btn-primary min-h-[48px] px-5">
          {pending ? "찾는 중..." : "찾기"}
        </button>
      </div>
      <input name="extra_terms" maxLength={200} placeholder="보조 단어(쉼표로, 선택) — 예: 공구, 체험단, 협찬, 도매" className="input w-full" />
      <label className="flex flex-wrap items-center gap-2 text-sm text-mx-text">
        매칭 기준
        <select name="min_score" defaultValue="40" className="input-sm min-h-[40px] w-56">
          <option value="60">엄격 — 주제가 확실한 채널만(60점↑)</option>
          <option value="40">보통 — 추천(40점↑)</option>
          <option value="20">넓게 — 조금이라도 맞으면(20점↑)</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-4 text-sm text-mx-text">
        {(Object.keys(CHANNEL_LABELS) as (keyof typeof CHANNEL_LABELS)[]).map((t) => (
          <label key={t} className="flex items-center gap-1.5">
            <input type="checkbox" name={`type_${t}`} defaultChecked={t === "blog" || t === "local"} /> {CHANNEL_LABELS[t]}
          </label>
        ))}
      </div>
      <p className="text-xs text-mx-muted">네이버 공식 검색 API(회원님 본인 키)로 찾습니다. 업체는 한 번에 최대 5곳씩 나옵니다. 연락처는 검색 결과에 없으니, 채널을 열어 공개된 연락처를 확인해 적어 주세요.</p>
      {message && (
        <p className={`rounded-lg border px-3 py-2 text-sm ${message.ok ? "border-mx-success text-mx-success" : "border-mx-danger text-mx-danger"}`}>
          {message.text} {message.needsKey && <Link href="/settings" className="underline">설정으로 가기 →</Link>}
        </p>
      )}
    </form>
  );
}

export interface PartnerRow {
  id: string; keyword: string; channel_type: keyof typeof CHANNEL_LABELS; name: string; url: string;
  summary: string; category: string; address: string;
  public_phone: string | null; public_email: string | null; contact_note: string | null;
  match_score: number; match_reasons: string; created_at: string;
}

export function ContactForm({ row }: { row: PartnerRow }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    setPending(true); setError(null); setSaved(false);
    try {
      const r = await saveContactAction(new FormData(form));
      if (r.error) setError(r.error); else { setSaved(true); router.refresh(); }
    } finally { setPending(false); }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="id" value={row.id} />
      <input name="public_phone" defaultValue={row.public_phone ?? ""} placeholder="공개 전화" maxLength={40} className="input-sm w-32" />
      <input name="public_email" defaultValue={row.public_email ?? ""} placeholder="공개 이메일" maxLength={200} className="input-sm w-44" />
      <input name="contact_note" defaultValue={row.contact_note ?? ""} placeholder="메모(어디에 공개돼 있었는지)" maxLength={300} className="input-sm min-w-[140px] flex-1" />
      <button type="submit" disabled={pending} className="mx-btn-ghost px-3 text-xs">{pending ? "..." : saved ? "✅ 저장" : "저장"}</button>
      {error && <span className="text-xs text-mx-danger">{error}</span>}
    </form>
  );
}

const cell = (v: string) => (/[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function PartnerCsvButton({ rows }: { rows: PartnerRow[] }) {
  function download() {
    const head = ["키워드", "매칭 점수", "매칭 이유", "종류", "이름", "주소(링크)", "요약", "분류", "위치", "공개 전화", "공개 이메일", "메모", "담은 날"];
    const body = rows.map((r) => [r.keyword, String(r.match_score), r.match_reasons, CHANNEL_LABELS[r.channel_type], r.name, r.url, r.summary, r.category, r.address,
      r.public_phone ?? "", r.public_email ?? "", r.contact_note ?? "", new Date(r.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })]);
    const csv = "﻿" + [head, ...body].map((l) => l.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `제휴타깃_${new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button type="button" onClick={download} disabled={rows.length === 0} className="mx-btn-ghost px-3 text-xs">⬇️ CSV 내려받기</button>;
}
