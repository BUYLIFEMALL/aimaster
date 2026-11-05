"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { agreePartnerNoticeAction, searchPartnersAction, saveContactAction, suggestPartnerTermsAction } from "@/lib/actions/partners";
import { CHANNEL_LABELS, PARTNER_NOTICE_LINES, STARTER_TOPICS } from "@/lib/partners/notice";
import type { Suggestions } from "@/lib/partners/suggest";

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
  const [keyword, setKeyword] = useState("");
  const [extra, setExtra] = useState("");
  const [sugg, setSugg] = useState<Suggestions | null>(null);
  const [suggPending, setSuggPending] = useState(false);
  const [suggError, setSuggError] = useState<string | null>(null);

  async function loadSuggestions(topic?: string) {
    const k = (topic ?? keyword).trim();
    if (topic) setKeyword(topic);
    setSuggPending(true); setSuggError(null);
    try {
      const r = await suggestPartnerTermsAction(k);
      if (r.error) { setSuggError(r.error); setSugg(null); } else setSugg(r.data ?? null);
    } finally { setSuggPending(false); }
  }

  function addExtra(term: string) {
    const parts = extra.split(",").map((t) => t.trim()).filter(Boolean);
    if (!parts.includes(term)) setExtra([...parts, term].join(", "));
  }

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
        <input name="keyword" required maxLength={60} value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="주제 키워드 (예: 공동구매)" className="input min-w-[200px] flex-1" />
        <button type="button" onClick={() => loadSuggestions()} disabled={suggPending} className="mx-btn-ghost min-h-[48px] px-4">
          {suggPending ? "추천 중..." : "🔮 키워드 추천 받기"}
        </button>
        <button type="submit" disabled={pending} className="mx-btn-primary min-h-[48px] px-5">
          {pending ? "찾는 중..." : "찾기"}
        </button>
      </div>
      <div className="space-y-1">
        <p className="text-xs text-mx-muted">어떤 키워드로 찾을지 모르겠다면 주제를 눌러 보세요 — 추천 키워드가 나옵니다.</p>
        <div className="flex flex-wrap gap-1.5">
          {STARTER_TOPICS.map((t) => (
            <button key={t} type="button" onClick={() => loadSuggestions(t)} className="rounded-full border border-mx-border px-3 py-1 text-xs text-mx-text hover:border-mx-success">{t}</button>
          ))}
        </div>
      </div>
      {suggError && <p className="text-sm text-mx-danger">{suggError}</p>}
      {sugg && <SuggestionPanel sugg={sugg} onUse={(k) => setKeyword(k)} onAdd={addExtra} />}
      <input name="extra_terms" maxLength={200} value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="보조 단어(쉼표로, 선택) — 예: 공구, 체험단, 협찬, 도매" className="input w-full" />
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

function Chip({ text, hint, onUse, onAdd }: { text: string; hint?: string; onUse: () => void; onAdd: () => void }) {
  return (
    <span className="inline-flex items-center overflow-hidden rounded-full border border-mx-border text-xs">
      <button type="button" onClick={onUse} title="이 키워드로 찾기" className="px-2.5 py-1 text-mx-text hover:bg-mx-surface">{text}{hint && <span className="ml-1 text-mx-muted">{hint}</span>}</button>
      <button type="button" onClick={onAdd} title="보조 단어에 더하기" className="border-l border-mx-border px-2 py-1 text-mx-success hover:bg-mx-surface">＋</button>
    </span>
  );
}

function SuggestionPanel({ sugg, onUse, onAdd }: { sugg: Suggestions; onUse: (k: string) => void; onAdd: (k: string) => void }) {
  const fmt = (n: number) => (n >= 10000 ? `${Math.round(n / 1000) / 10}만` : n.toLocaleString("ko-KR"));
  return (
    <div className="space-y-3 rounded-lg border border-mx-border p-3">
      <p className="text-xs text-mx-muted">키워드를 누르면 그 키워드로 찾고, ＋를 누르면 보조 단어(매칭 판정)에 더합니다.</p>
      <div>
        <p className="mb-1 text-xs font-bold text-mx-text">① 메인 키워드</p>
        <Chip text={sugg.main} onUse={() => onUse(sugg.main)} onAdd={() => onAdd(sugg.main)} />
      </div>
      <div>
        <p className="mb-1 text-xs font-bold text-mx-text">② 연관 키워드 (네이버 자동완성)</p>
        <div className="flex flex-wrap gap-1.5">
          {sugg.related.length === 0 ? <span className="text-xs text-mx-muted">추천이 없습니다.</span> : sugg.related.map((k) => <Chip key={k} text={k} onUse={() => onUse(k)} onAdd={() => onAdd(k)} />)}
        </div>
      </div>
      <div>
        <p className="mb-1 text-xs font-bold text-mx-text">③ 많이 검색하는 키워드 (월간 검색량 순)</p>
        {sugg.popularNeedsKey ? (
          <p className="text-xs text-mx-muted">설정에서 네이버 검색광고 키(무료)를 등록하면 검색량 순으로 추천합니다. <Link href="/settings" className="underline">설정 →</Link></p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sugg.popular.length === 0 ? <span className="text-xs text-mx-muted">추천이 없습니다.</span> : sugg.popular.map((k) => <Chip key={k.keyword} text={k.keyword} hint={fmt(k.total)} onUse={() => onUse(k.keyword)} onAdd={() => onAdd(k.keyword)} />)}
          </div>
        )}
      </div>
      <div>
        <p className="mb-1 text-xs font-bold text-mx-text">④ 카테고리 (그 주제 업체·쇼핑몰의 실제 분류)</p>
        {sugg.categoriesNeedKey ? (
          <p className="text-xs text-mx-muted">설정에서 네이버 검색 키를 등록하면 카테고리를 추천합니다. <Link href="/settings" className="underline">설정 →</Link></p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {sugg.categories.length === 0 ? <span className="text-xs text-mx-muted">추천이 없습니다.</span> : sugg.categories.map((c) => <Chip key={c.text} text={c.text} hint={`${c.count}`} onUse={() => onUse(c.text)} onAdd={() => onAdd(c.text)} />)}
          </div>
        )}
      </div>
    </div>
  );
}

export interface PartnerRow {
  id: string; keyword: string; channel_type: keyof typeof CHANNEL_LABELS; name: string; url: string;
  summary: string; category: string; address: string;
  public_phone: string | null; public_email: string | null; contact_note: string | null;
  match_score: number; match_reasons: string; created_at: string;
  display_name: string | null; primary_contact: string | null; primary_type: "mobile" | "landline" | "email" | null;
  scan_status: "pending" | "scanning" | "done" | "none" | "stopped"; phones_mobile: string[]; phones_landline: string[]; emails: string[];
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
    const head = ["키워드", "매칭 점수", "매칭 이유", "대표 연락처", "대표 종류", "핸드폰", "일반전화", "이메일", "공개 이름", "종류", "이름", "주소(링크)", "요약", "분류", "위치", "공개 전화", "공개 이메일", "메모", "담은 날"];
    const body = rows.map((r) => [r.keyword, String(r.match_score), r.match_reasons, r.primary_contact ?? "", r.primary_type === "mobile" ? "핸드폰" : r.primary_type === "landline" ? "일반전화" : r.primary_type === "email" ? "이메일" : "", r.phones_mobile.join(" / "), r.phones_landline.join(" / "), r.emails.join(" / "), r.display_name ?? "", CHANNEL_LABELS[r.channel_type], r.name, r.url, r.summary, r.category, r.address,
      r.public_phone ?? "", r.public_email ?? "", r.contact_note ?? "", new Date(r.created_at).toLocaleDateString("ko-KR", { timeZone: "Asia/Seoul" })]);
    const csv = "﻿" + [head, ...body].map((l) => l.map(cell).join(",")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url; a.download = `제휴타깃_${new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })}.csv`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <button type="button" onClick={download} disabled={rows.length === 0} className="mx-btn-ghost px-3 text-xs">⬇️ CSV 내려받기</button>;
}
