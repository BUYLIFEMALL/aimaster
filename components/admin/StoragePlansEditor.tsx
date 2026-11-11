"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Save } from "lucide-react";

export interface EditablePlan {
  slug: string | null; // null = 새 요금제
  name: string;
  quota_mb: number;
  retention_days: number | null; // 생성 콘텐츠 보관(일)
  unlimited: boolean;
  posted_retention_days: number | null; // 포스팅된 콘텐츠 보관(일)
  posted_unlimited: boolean;
  price: number;
  billing_type: string;
  is_active: boolean;
  sort_order: number;
  subscribers: number;
}

const BILLING_OPTIONS: [string, string][] = [
  ["monthly", "1개월"],
  ["bimonthly", "2개월"],
  ["quarterly", "3개월"],
  ["biannual", "6개월"],
  ["annual", "12개월"],
];

/** 관리자: 저장 요금제 표 편집(용량·생성 보관·포스팅 보관·금액·결제 주기) — 등급 혜택은 2026-11-11 없앰 */
export default function StoragePlansEditor({ initialPlans }: { initialPlans: EditablePlan[] }) {
  const router = useRouter();
  const [plans, setPlans] = useState<EditablePlan[]>(initialPlans);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const update = (i: number, patch: Partial<EditablePlan>) => setPlans((prev) => prev.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  function addPlan() {
    setPlans((prev) => [
      ...prev,
      { slug: null, name: "새 요금제", quota_mb: 10240, retention_days: 180, unlimited: false, posted_retention_days: 365, posted_unlimited: false, price: 50000, billing_type: "monthly", is_active: false, sort_order: prev.length, subscribers: 0 },
    ]);
  }

  async function save() {
    setPending(true);
    setMessage(null);
    const res = await fetch("/api/admin/storage-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plans: plans.map((p) => ({
          slug: p.slug,
          name: p.name,
          quota_mb: Number(p.quota_mb),
          retention_days: p.unlimited ? null : Number(p.retention_days),
          unlimited: p.unlimited,
          posted_retention_days: p.posted_unlimited ? null : Number(p.posted_retention_days),
          posted_unlimited: p.posted_unlimited,
          price: Number(p.price),
          billing_type: p.billing_type,
          is_active: p.is_active,
          sort_order: Number(p.sort_order),
        })),
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setMessage({ ok: false, text: json.error ?? "저장하지 못했습니다." });
      return;
    }
    setMessage({ ok: true, text: `저장했습니다. 보관 연장 회원 표시가 바뀐 회원 ${json.exemptChanged ?? 0}명.` });
    router.refresh();
  }

  const input = "w-full rounded-md bg-white/5 border border-white/15 px-2 py-1.5 text-sm text-white";
  const mbLabel = (mb: number) => (Number(mb) >= 1024 ? `= ${Math.round((Number(mb) / 1024) * 10) / 10}GB` : `= ${Number(mb)}MB`);
  const daysCell = (i: number, p: EditablePlan, key: "retention_days" | "posted_retention_days", ukey: "unlimited" | "posted_unlimited", def: number) => (
    <div className="flex items-center gap-1.5">
      <input
        className={input}
        inputMode="numeric"
        disabled={p[ukey]}
        value={p[ukey] ? "" : p[key] ?? ""}
        placeholder={p[ukey] ? "무기한" : "일"}
        onChange={(e) => update(i, { [key]: e.target.value as unknown as number } as Partial<EditablePlan>)}
      />
      <label className="flex items-center gap-1 text-[11px] text-subtext whitespace-nowrap">
        <input type="checkbox" checked={p[ukey]} onChange={(e) => update(i, { [ukey]: e.target.checked, [key]: e.target.checked ? null : def } as Partial<EditablePlan>)} className="accent-gold" />
        무기한
      </label>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="glass-card p-0 overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead>
            <tr className="border-b border-white/10 text-xs text-subtext">
              <th className="text-left px-3 py-2">요금제</th>
              <th className="text-left px-3 py-2 w-28">용량(MB)</th>
              <th className="text-left px-3 py-2 w-40">생성 콘텐츠 보관</th>
              <th className="text-left px-3 py-2 w-40">포스팅 콘텐츠 보관</th>
              <th className="text-left px-3 py-2 w-28">금액(원)</th>
              <th className="text-left px-3 py-2 w-28">결제 주기</th>
              <th className="text-center px-3 py-2 w-20">사용</th>
              <th className="text-center px-3 py-2 w-16">순서</th>
              <th className="text-right px-3 py-2 w-20">구독자</th>
            </tr>
          </thead>
          <tbody>
            {plans.map((p, i) => {
              const isFree = p.slug === "free";
              return (
                <tr key={p.slug ?? `new-${i}`} className="border-b border-white/5">
                  <td className="px-3 py-2">
                    <input className={input} value={p.name} onChange={(e) => update(i, { name: e.target.value })} />
                    <p className="text-[11px] text-subtext mt-0.5">{isFree ? "기본(일반 회원 무료)" : p.slug ?? "새 요금제(저장 시 생성)"}</p>
                  </td>
                  <td className="px-3 py-2">
                    <input className={input} inputMode="numeric" value={p.quota_mb} onChange={(e) => update(i, { quota_mb: e.target.value as unknown as number })} />
                    <p className="text-[11px] text-subtext mt-0.5">{mbLabel(p.quota_mb)}</p>
                  </td>
                  <td className="px-3 py-2">{daysCell(i, p, "retention_days", "unlimited", 30)}</td>
                  <td className="px-3 py-2">{daysCell(i, p, "posted_retention_days", "posted_unlimited", 90)}</td>
                  <td className="px-3 py-2">
                    {isFree ? <span className="text-subtext">무료</span> : <input className={input} inputMode="numeric" value={p.price} onChange={(e) => update(i, { price: e.target.value as unknown as number })} />}
                  </td>
                  <td className="px-3 py-2">
                    {isFree ? (
                      <span className="text-subtext">—</span>
                    ) : (
                      <select className={input} value={p.billing_type} onChange={(e) => update(i, { billing_type: e.target.value })}>
                        {BILLING_OPTIONS.map(([v, l]) => (
                          <option key={v} value={v} className="bg-zinc-900">
                            {l}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" disabled={isFree} checked={p.is_active} onChange={(e) => update(i, { is_active: e.target.checked })} className="accent-gold" />
                  </td>
                  <td className="px-3 py-2">
                    <input className={`${input} text-center`} inputMode="numeric" value={p.sort_order} onChange={(e) => update(i, { sort_order: e.target.value as unknown as number })} />
                  </td>
                  <td className="px-3 py-2 text-right text-subtext">{isFree ? "—" : `${p.subscribers}명`}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <button type="button" onClick={addPlan} className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-3 py-1.5 text-xs text-subtext hover:text-white">
        <Plus size={14} /> 요금제 추가
      </button>

      <div className="flex items-center gap-3">
        <button type="button" disabled={pending} onClick={save} className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-4 py-2 text-sm font-bold text-black disabled:opacity-40">
          <Save size={14} /> {pending ? "저장 중…" : "저장"}
        </button>
        {message && <span className={`text-xs ${message.ok ? "text-emerald-400" : "text-red-400"}`}>{message.text}</span>}
      </div>
      <p className="text-subtext text-xs break-keep">
        참고: 「생성 콘텐츠」는 만들기만 하고 발행하지 않은 자료, 「포스팅 콘텐츠」는 블로그·SNS·유튜브에 발행한 자료입니다(1GB = 1024MB). 용량·보관 기간을 바꾸면 그 요금제를 쓰는 기존 구독자에게도 바로 적용됩니다. 「사용」을 끄면 새 결제만 막히고 기존 구독은 만료일까지 유지됩니다. 금액·결제 주기는 다음 결제부터 적용됩니다.
      </p>
    </div>
  );
}
