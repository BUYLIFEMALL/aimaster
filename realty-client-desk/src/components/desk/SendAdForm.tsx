"use client";

import { useActionState, useMemo, useState } from "react";
import { sendListingAdAction, type SendState } from "@/lib/actions/listings";

export type Candidate = { id: string; name: string; phone: string; why: string[]; ok: boolean; note: string; soon: boolean; sent: boolean };

// 2단계(2026-11-03): 중개사가 고객을 직접 고르고, 미리보기로 실제 문자 모양을 확인한 뒤 보낸다(자동 일괄 발송 없음).
export function SendAdForm({ listingId, draft, header, footer, candidates, night, ready }: {
  listingId: string; draft: string; header: string; footer: string; candidates: Candidate[]; night: boolean; ready: string | null;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const [state, action, pending] = useActionState<SendState, FormData>(async (p, fd) => {
    const r = await sendListingAdAction(p, fd);
    if (r.results) setPicked([]); // 보낸 뒤에는 고른 목록을 비움(보낸 고객은 「이미 보냈어요」로 바뀜)
    return r;
  }, {});
  const [body, setBody] = useState(draft);
  const selectable = candidates.filter((c) => c.ok && !c.sent);
  const preview = useMemo(() => `${header}\n${body.trim()}\n${footer}`, [header, body, footer]);
  const len = [...preview].length;
  const blocked = night || Boolean(ready);

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="listingId" value={listingId} />
      <div className="mx-card p-5">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-mx-text">👥 조건이 맞는 고객 {candidates.length}명</h2>
          {selectable.length > 0 && (
            <button type="button" onClick={() => setPicked(picked.length === selectable.length ? [] : selectable.map((c) => c.id))} className="mx-btn-ghost min-h-[40px] px-3 text-xs">
              {picked.length === selectable.length ? "모두 해제" : `보낼 수 있는 ${selectable.length}명 모두 고르기`}
            </button>
          )}
        </div>
        {candidates.length === 0 ? (
          <p className="text-sm text-mx-muted">조건이 맞는 고객이 아직 없어요. 관심고객의 원하는 지역에 이 매물 소재지의 동 이름이 들어 있는지 확인해 보세요.</p>
        ) : (
          <ul className="divide-y divide-mx-border text-sm">
            {candidates.map((c) => {
              const can = c.ok && !c.sent;
              return (
                <li key={c.id} className="flex min-h-[48px] items-start gap-3 py-2">
                  <input
                    type="checkbox" name="clientIds" value={c.id} disabled={!can} checked={picked.includes(c.id)}
                    onChange={(e) => setPicked(e.target.checked ? [...picked, c.id] : picked.filter((x) => x !== c.id))}
                    aria-label={`${c.name} 고르기`} className="mt-1 h-5 w-5 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-mx-text">{c.name} <span className="font-normal text-mx-muted">{c.phone}</span></p>
                    <p className="text-xs text-mx-muted">맞는 점: {c.why.join(" · ")}</p>
                    <p className={`text-xs ${can ? "text-mx-success" : "text-mx-danger"}`}>
                      {c.sent ? "이 매물은 이미 보냈어요" : c.ok ? `광고 문자 보낼 수 있음${c.soon ? " · ⚠ 동의 2년이 곧 돼요(다시 확인해 주세요)" : ""}` : `보낼 수 없음: ${c.note}`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="mx-card space-y-3 p-5">
        <h2 className="text-base font-bold text-mx-text">✉️ 보낼 내용</h2>
        <textarea name="body" value={body} onChange={(e) => setBody(e.target.value)} rows={6} maxLength={600} className="mx-input" />
        <div>
          <p className="mb-1 text-xs font-semibold text-mx-muted">고객이 받는 모양 (맨 앞·맨 끝은 법에 따라 자동으로 붙고 고칠 수 없어요 · {len}자{len > 90 ? ", 장문 문자(LMS)" : ""})</p>
          <pre className="whitespace-pre-wrap rounded-xl border border-mx-border bg-[#f7f9fb] p-3 text-sm text-mx-text">{preview}</pre>
          <p className="mt-1 text-xs text-mx-muted">수신거부 링크는 고객마다 다른 주소로 바뀌어 들어가요.</p>
        </div>
        {night && <p className="rounded-lg bg-[#fff4e5] p-3 text-sm text-[#8a5300]">🌙 지금은 밤 9시~아침 8시라 광고 문자를 보낼 수 없어요(정보통신망법). 아침 8시 이후에 보내 주세요.</p>}
        {ready && <p className="rounded-lg bg-[#fff4e5] p-3 text-sm text-[#8a5300]">⚙️ {ready} <a href="/settings" className="underline">API키등록·플랫폼연동</a></p>}
        {state.error && <p className="text-sm text-mx-danger">{state.error}</p>}
        {state.success && <p className="text-sm text-mx-success">{state.success}</p>}
        {state.results && state.results.length > 0 && (
          <ul className="text-xs text-mx-muted">{state.results.map((r, i) => <li key={i}>{r.ok ? "✅" : "⛔"} {r.name} — {r.note}</li>)}</ul>
        )}
        <button type="submit" disabled={pending || blocked || picked.length === 0} className="mx-btn-primary min-h-[44px] px-4 text-sm disabled:opacity-60">
          {pending ? "보내는 중…" : `고른 ${picked.length}명에게 보내기`}
        </button>
      </div>
    </form>
  );
}
