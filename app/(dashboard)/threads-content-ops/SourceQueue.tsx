"use client";

import { useMemo, useState } from "react";
import { Archive, CheckCircle2, CircleAlert, ExternalLink, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import {
  createContentSource,
  deleteContentSource,
  setContentSourceStatus,
  updateContentSource,
} from "./web-actions";

type Account = { id: string; username: string | null };
type Source = {
  id: string;
  account_id: string;
  source_type: string;
  title: string;
  source_url: string | null;
  summary: string;
  status: string;
  created_at: string;
  updated_at: string;
};

const TYPES: { value: string; label: string; urlLabel: string; urlHint: string; titleHint: string }[] = [
  { value: "blog", label: "블로그", urlLabel: "블로그 글 주소", urlHint: "https://blog.naver.com/…", titleHint: "예: 겨울철 난방비 줄이는 방법 정리" },
  { value: "coupang", label: "쿠팡 파트너스", urlLabel: "쿠팡 파트너스 상품 링크", urlHint: "https://link.coupang.com/…", titleHint: "예: 전기 히터 상품명" },
  { value: "naver_brand_connect", label: "네이버 브랜드 커넥트", urlLabel: "브랜드 커넥트 제휴 링크", urlHint: "https://naver.me/…", titleHint: "예: 제휴 상품 또는 캠페인 이름" },
];

const STATUS: Record<string, { label: string; tone: string }> = {
  ready: { label: "사용 가능", tone: "bg-emerald-50 text-emerald-700" },
  used: { label: "사용 완료", tone: "bg-sky-50 text-sky-700" },
  archived: { label: "보관", tone: "bg-neutral-100 text-neutral-600" },
  failed: { label: "확인 필요", tone: "bg-rose-50 text-rose-700" },
};

const inputClass = "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400";
const typeLabel = (value: string) => TYPES.find((type) => type.value === value)?.label ?? value;

export default function SourceQueue({ accounts, sources }: { accounts: Account[]; sources: Source[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [form, setForm] = useState({ sourceType: "blog", title: "", sourceUrl: "", summary: "" });
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ title: "", sourceUrl: "", summary: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const mine = useMemo(() => sources.filter((source) => source.account_id === accountId), [sources, accountId]);
  const visible = useMemo(
    () => mine.filter((source) => (typeFilter === "all" || source.source_type === typeFilter) && (statusFilter === "all" || source.status === statusFilter)),
    [mine, typeFilter, statusFilter],
  );

  if (!accounts.length) {
    return <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"><h2 className="font-bold text-neutral-900">운영할 Threads 계정을 먼저 연결하세요</h2><p className="mt-2 text-sm text-neutral-600">API키등록·플랫폼연동에서 회원님의 Threads 앱과 계정을 연결하면 계정별 콘텐츠 소스를 등록할 수 있습니다.</p></div>;
  }

  const selectedType = TYPES.find((type) => type.value === form.sourceType) ?? TYPES[0];
  const count = (status: string) => mine.filter((source) => source.status === status).length;

  const run = async (action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await action();
      setMessage(result.ok ? { ok: true, text: success } : { ok: false, text: result.error });
      return result.ok;
    } catch {
      setMessage({ ok: false, text: "요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요." });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const register = async () => {
    const ok = await run(() => createContentSource({ accountId, ...form }), "소스를 등록했습니다.");
    if (ok) setForm((current) => ({ ...current, title: "", sourceUrl: "", summary: "" }));
  };

  const startEdit = (source: Source) => {
    setEditingId(source.id);
    setDraft({ title: source.title, sourceUrl: source.source_url ?? "", summary: source.summary });
    setMessage(null);
  };

  const saveEdit = async () => {
    if (!editingId) return;
    const ok = await run(() => updateContentSource({ id: editingId, ...draft }), "소스를 수정했습니다.");
    if (ok) setEditingId(null);
  };

  const remove = async (source: Source) => {
    if (!window.confirm(`"${source.title}" 소스를 삭제할까요? 되돌릴 수 없습니다.`)) return;
    await run(() => deleteContentSource(source.id), "소스를 삭제했습니다.");
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-xs font-bold text-gold">CONTENT SOURCE QUEUE</p>
          <h2 className="mt-1 text-xl font-bold text-neutral-900">콘텐츠 소스</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">블로그 글, 쿠팡 파트너스 상품, 네이버 브랜드 커넥트 링크를 계정별로 등록해 두는 곳입니다. 회원님이 입력한 값만 본인 계정에 저장하며, 외부 사이트에서 정보를 자동으로 가져오지 않습니다. 소스로 초안을 만드는 연결은 다음 단계에서 추가됩니다.</p>
        </div>
        <select aria-label="운영 계정 선택" className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800" value={accountId} onChange={(event) => { setAccountId(event.target.value); setEditingId(null); setMessage(null); }}>
          {accounts.map((account) => <option key={account.id} value={account.id}>@{account.username ?? "Threads 계정"}</option>)}
        </select>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-4">
      <Overview label="등록한 소스" value={mine.length} tone="text-violet-700" />
      <Overview label="사용 가능" value={count("ready")} tone="text-emerald-700" />
      <Overview label="사용 완료" value={count("used")} tone="text-sky-700" />
      <Overview label="보관" value={count("archived")} tone="text-neutral-600" />
    </section>

    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <h3 className="flex items-center gap-2 font-bold text-neutral-900"><Plus size={18} className="text-gold" />새 소스 등록</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label><span className="mb-2 block text-sm font-semibold text-neutral-800">소스 종류</span><select className={inputClass} value={form.sourceType} onChange={(event) => setForm({ ...form, sourceType: event.target.value })}>{TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
        <label><span className="mb-2 block text-sm font-semibold text-neutral-800">제목</span><input className={inputClass} maxLength={200} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder={selectedType.titleHint} /></label>
        <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold text-neutral-800">{selectedType.urlLabel}</span><input className={inputClass} maxLength={2000} inputMode="url" value={form.sourceUrl} onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })} placeholder={selectedType.urlHint} /></label>
        <label className="md:col-span-2"><span className="mb-2 block text-sm font-semibold text-neutral-800">메모 (선택)</span><textarea className={`${inputClass} min-h-20 resize-y`} maxLength={1000} value={form.summary} onChange={(event) => setForm({ ...form, summary: event.target.value })} placeholder="초안에 꼭 넣고 싶은 핵심 내용, 강조점, 주의사항을 적어 두세요." /></label>
      </div>
      <div className="mt-4 flex justify-end"><button className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300" disabled={busy || !form.title.trim() || !form.sourceUrl.trim()} onClick={() => void register()}><Plus size={16} />{busy ? "처리 중…" : "소스 등록"}</button></div>
    </section>

    {message && <p className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-800" role="status">{message.ok ? <CheckCircle2 size={16} className="shrink-0 text-emerald-600" /> : <CircleAlert size={16} className="shrink-0 text-rose-600" />}{message.text}</p>}

    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-bold text-neutral-900">등록한 소스 <span className="text-sm font-normal text-neutral-500">({visible.length}건)</span></h3>
        <div className="flex flex-wrap gap-2">
          <select aria-label="종류 필터" className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}><option value="all">전체 종류</option>{TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>
          <select aria-label="상태 필터" className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-800" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="all">전체 상태</option><option value="ready">사용 가능</option><option value="used">사용 완료</option><option value="archived">보관</option></select>
        </div>
      </div>

      {!visible.length ? <div className="mt-4 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-5 text-sm text-neutral-600">{mine.length ? "조건에 맞는 소스가 없습니다. 필터를 바꿔 보세요." : "아직 등록한 소스가 없습니다. 위에서 블로그·쿠팡·네이버 브랜드 커넥트 링크를 등록해 보세요."}</div> : <ul className="mt-4 divide-y divide-neutral-200 overflow-hidden rounded-xl border border-neutral-200">{visible.map((source) => {
        const status = STATUS[source.status] ?? { label: source.status, tone: "bg-neutral-100 text-neutral-600" };
        return <li key={source.id} className="p-4">
          {editingId === source.id ? <div className="space-y-3">
            <input className={inputClass} maxLength={200} value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} aria-label="제목" />
            <input className={inputClass} maxLength={2000} inputMode="url" value={draft.sourceUrl} onChange={(event) => setDraft({ ...draft, sourceUrl: event.target.value })} aria-label="링크" />
            <textarea className={`${inputClass} min-h-20 resize-y`} maxLength={1000} value={draft.summary} onChange={(event) => setDraft({ ...draft, summary: event.target.value })} aria-label="메모" />
            <div className="flex justify-end gap-2"><button className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50" disabled={busy} onClick={() => setEditingId(null)}>취소</button><button className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-bold text-white hover:bg-neutral-700 disabled:bg-neutral-300" disabled={busy || !draft.title.trim() || !draft.sourceUrl.trim()} onClick={() => void saveEdit()}>수정 저장</button></div>
          </div> : <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">{typeLabel(source.source_type)}</span><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${status.tone}`}>{status.label}</span><span className="text-xs text-neutral-400">{new Date(source.created_at).toLocaleDateString("ko-KR")}</span></div>
              <p className="mt-2 font-semibold text-neutral-900">{source.title}</p>
              {source.source_url && <a className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs text-sky-700 hover:underline" href={source.source_url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} className="shrink-0" /><span className="truncate">{source.source_url}</span></a>}
              {source.summary && <p className="mt-2 whitespace-pre-wrap text-sm text-neutral-600">{source.summary}</p>}
            </div>
            <div className="flex shrink-0 flex-wrap gap-1.5">
              <IconButton label="수정" onClick={() => startEdit(source)} disabled={busy}><Pencil size={14} /></IconButton>
              {source.status !== "ready" && <IconButton label="사용 가능으로" onClick={() => void run(() => setContentSourceStatus({ id: source.id, status: "ready" }), "사용 가능으로 되돌렸습니다.")} disabled={busy}><RotateCcw size={14} /></IconButton>}
              {source.status !== "used" && <IconButton label="사용 완료 표시" onClick={() => void run(() => setContentSourceStatus({ id: source.id, status: "used" }), "사용 완료로 표시했습니다.")} disabled={busy}><CheckCircle2 size={14} /></IconButton>}
              {source.status !== "archived" && <IconButton label="보관" onClick={() => void run(() => setContentSourceStatus({ id: source.id, status: "archived" }), "보관했습니다.")} disabled={busy}><Archive size={14} /></IconButton>}
              <IconButton label="삭제" danger onClick={() => void remove(source)} disabled={busy}><Trash2 size={14} /></IconButton>
            </div>
          </div>}
        </li>;
      })}</ul>}
    </section>
  </div>;
}

function Overview({ label, value, tone }: { label: string; value: number; tone: string }) {
  return <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">{label}</p><p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p></div>;
}

function IconButton({ label, onClick, disabled, danger, children }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean; children: React.ReactNode }) {
  return <button type="button" title={label} aria-label={label} disabled={disabled} onClick={onClick} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${danger ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"}`}>{children}{label}</button>;
}
