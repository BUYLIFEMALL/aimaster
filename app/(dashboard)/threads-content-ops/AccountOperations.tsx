"use client";

import { useMemo, useState, type ReactNode } from "react";
import { CheckCircle2, CircleAlert, Save, Settings2 } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import { saveOperationProfile } from "./web-actions";

type Account = { id: string; username: string | null; token_expires_at: string | null };
type Profile = {
  account_id: string;
  topic: string;
  personality: string;
  tone: string;
  target_audience: string;
  forbidden_topics: string;
  forbidden_expressions: string;
  daily_ratio: number;
  promotional_ratio: number;
  daily_post_target: number;
  comment_check_interval_minutes: number;
  operating_start: string | null;
  operating_end: string | null;
  automation_enabled: boolean;
  updated_at: string;
};

type FormState = {
  topic: string; personality: string; tone: string; targetAudience: string;
  forbiddenTopics: string; forbiddenExpressions: string; dailyRatio: number;
  promotionalRatio: number; dailyPostTarget: number; commentCheckIntervalMinutes: number;
  operatingStart: string; operatingEnd: string; automationEnabled: boolean;
};

const defaults: FormState = {
  topic: "", personality: "", tone: "", targetAudience: "", forbiddenTopics: "", forbiddenExpressions: "",
  dailyRatio: 2, promotionalRatio: 1, dailyPostTarget: 1, commentCheckIntervalMinutes: 30,
  operatingStart: "09:00", operatingEnd: "21:00", automationEnabled: false,
};

function toForm(profile?: Profile): FormState {
  if (!profile) return { ...defaults };
  return {
    topic: profile.topic, personality: profile.personality, tone: profile.tone, targetAudience: profile.target_audience,
    forbiddenTopics: profile.forbidden_topics, forbiddenExpressions: profile.forbidden_expressions,
    dailyRatio: profile.daily_ratio, promotionalRatio: profile.promotional_ratio, dailyPostTarget: profile.daily_post_target,
    commentCheckIntervalMinutes: profile.comment_check_interval_minutes,
    operatingStart: profile.operating_start?.slice(0, 5) ?? "", operatingEnd: profile.operating_end?.slice(0, 5) ?? "",
    automationEnabled: profile.automation_enabled,
  };
}

export default function AccountOperations({ accounts, profiles }: { accounts: Account[]; profiles: Profile[] }) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const profileByAccount = useMemo(() => new Map(profiles.map((profile) => [profile.account_id, profile])), [profiles]);
  const [form, setForm] = useState<FormState>(() => toForm(profileByAccount.get(accounts[0]?.id ?? "")));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  if (!accounts.length) return <GlassCard className="p-6"><h2 className="font-bold text-white">운영할 Threads 계정을 먼저 연결하세요</h2><p className="mt-2 text-sm text-subtext">API키등록·플랫폼연동에서 회원님의 Threads 앱과 계정을 연결하면 계정별 운영정보를 저장할 수 있습니다.</p></GlassCard>;

  const selected = accounts.find((account) => account.id === accountId) ?? accounts[0];
  const selectAccount = (nextId: string) => {
    setAccountId(nextId);
    setForm(toForm(profileByAccount.get(nextId)));
    setMessage("");
  };
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => ({ ...current, [key]: value }));
  const save = async () => {
    setBusy(true); setMessage("");
    try {
      await saveOperationProfile({ accountId: selected.id, ...form });
      setMessage("운영 정보를 저장했습니다. 자동 발행 실행은 별도 워커가 연결되기 전까지 시작되지 않습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "운영 정보를 저장하지 못했습니다.");
    } finally { setBusy(false); }
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="text-xs font-bold text-gold">ACCOUNT OPERATIONS</p><h2 className="mt-1 text-xl font-bold text-neutral-900">계정 관리</h2><p className="mt-2 text-sm text-neutral-600">계정별 콘텐츠 성격과 운영 시간은 회원님 계정 안에만 저장됩니다.</p></div><select aria-label="운영 계정 선택" className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-semibold text-neutral-800" value={accountId} onChange={(event) => selectAccount(event.target.value)}>{accounts.map((account) => <option key={account.id} value={account.id}>@{account.username ?? "Threads 계정"}</option>)}</select></div></section>

    <section className="grid gap-3 sm:grid-cols-3"><OverviewCard label="전체 계정" value={accounts.length} tone="text-violet-700" /><OverviewCard label="운영정보 저장" value={profiles.length} tone="text-emerald-700" /><OverviewCard label="자동화 사용 설정" value={profiles.filter((profile) => profile.automation_enabled).length} tone="text-amber-700" /></section>

    <GlassCard className="p-5"><div className="flex items-center gap-2"><Settings2 size={18} className="text-gold" /><div><h3 className="font-bold text-white">@{selected.username ?? "Threads 계정"} 운영정보</h3><p className="mt-1 text-xs text-subtext">원본 프로그램의 운영 정보 항목을 웹 계정별 설정으로 옮겼습니다.</p></div></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="주제"><textarea className={textareaClass} value={form.topic} onChange={(event) => update("topic", event.target.value)} placeholder="예: AI, 네이버블로그, 부업" /></Field><Field label="말투"><textarea className={textareaClass} value={form.tone} onChange={(event) => update("tone", event.target.value)} placeholder="예: 친근한 친구에게 하는 반말체" /></Field><Field label="성격 (선택)"><textarea className={textareaClass} value={form.personality} onChange={(event) => update("personality", event.target.value)} placeholder="예: 신뢰감 있는 실전형" /></Field><Field label="대상 독자 (선택)"><textarea className={textareaClass} value={form.targetAudience} onChange={(event) => update("targetAudience", event.target.value)} placeholder="예: 40~50대 1인 사업자" /></Field><Field label="금지 주제 (선택)"><textarea className={textareaClass} value={form.forbiddenTopics} onChange={(event) => update("forbiddenTopics", event.target.value)} placeholder="다루지 않을 주제를 입력하세요" /></Field><Field label="금지 표현 (선택)"><textarea className={textareaClass} value={form.forbiddenExpressions} onChange={(event) => update("forbiddenExpressions", event.target.value)} placeholder="사용하지 않을 표현을 입력하세요" /></Field></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><NumberField label="일상 비율" value={form.dailyRatio} onChange={(value) => update("dailyRatio", value)} min={0} max={100} /><NumberField label="홍보 비율" value={form.promotionalRatio} onChange={(value) => update("promotionalRatio", value)} min={0} max={100} /><NumberField label="하루 게시 목표" value={form.dailyPostTarget} onChange={(value) => update("dailyPostTarget", value)} min={0} max={50} /><NumberField label="댓글 확인 주기(분)" value={form.commentCheckIntervalMinutes} onChange={(value) => update("commentCheckIntervalMinutes", value)} min={5} max={1440} /></div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2"><TimeField label="운영 시작" value={form.operatingStart} onChange={(value) => update("operatingStart", value)} /><TimeField label="운영 종료" value={form.operatingEnd} onChange={(value) => update("operatingEnd", value)} /></div>
      <label className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4"><input className="mt-0.5 h-4 w-4 accent-amber-600" type="checkbox" checked={form.automationEnabled} onChange={(event) => update("automationEnabled", event.target.checked)} /><span><span className="block text-sm font-semibold text-neutral-900">이 계정 자동화 사용 설정</span><span className="mt-1 block text-xs leading-relaxed text-neutral-600">현재는 회원님의 운영 선호 설정만 저장합니다. 예약·무인 발행 워커가 별도 검증되기 전에는 이 스위치만으로 게시가 실행되지 않습니다.</span></span></label>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-neutral-500">마지막 저장: {profileByAccount.get(selected.id)?.updated_at ? new Date(profileByAccount.get(selected.id)!.updated_at).toLocaleString("ko-KR") : "아직 저장하지 않음"}</p><button className="inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-bold text-[#ffffff] hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-300" disabled={busy} onClick={() => void save()}><Save size={16} />{busy ? "저장 중…" : "운영정보 저장"}</button></div>
      {message && <p className="mt-3 flex items-center gap-2 text-sm text-neutral-700" role="status">{message.includes("저장했습니다") ? <CheckCircle2 size={16} className="text-emerald-600" /> : <CircleAlert size={16} className="text-rose-600" />}{message}</p>}
    </GlassCard>
  </div>;
}

function OverviewCard({ label, value, tone }: { label: string; value: number; tone: string }) { return <div className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm"><p className="text-xs text-neutral-500">{label}</p><p className={`mt-2 text-2xl font-bold ${tone}`}>{value}</p></div>; }
const textareaClass = "min-h-24 w-full resize-y rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400";
function Field({ label, children }: { label: string; children: ReactNode }) { return <label><span className="mb-2 block text-sm font-semibold text-neutral-800">{label}</span>{children}</label>; }
function NumberField({ label, value, onChange, min, max }: { label: string; value: number; onChange: (value: number) => void; min: number; max: number }) { return <label><span className="mb-2 block text-sm font-semibold text-neutral-800">{label}</span><input className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900" type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} /></label>; }
function TimeField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label><span className="mb-2 block text-sm font-semibold text-neutral-800">{label}</span><input className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900" type="time" value={value} onChange={(event) => onChange(event.target.value)} /></label>; }
