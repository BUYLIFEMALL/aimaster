"use client";

// C-1(2026-11-20): `/listings`의 등록 영역. 매물 알림이 연 창(opener)일 때만 창 사이 메시지로 후보를 받는다(A6 계약, lib/desk/prefill.ts).
// 받은 값은 이 화면 메모리에만 있다 — 주소·저장소·DOM 속성·로그에 남기지 않고, 등록 성공·「후보 비우기」·탭 닫기 때 버린다.
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getHandoffAcct } from "@/lib/actions/handoff";
import { findSimilar, startDeskReceive, type MyListing, type PrefillDefaults, type WindowLike } from "@/lib/desk/prefill";
import { AddListingForm } from "@/components/desk/AddListingForm";

export function ListingIntake({ mine }: { mine: MyListing[] }) {
  const [candidate, setCandidate] = useState<PrefillDefaults | null>(null);
  const [rejected, setRejected] = useState(false);

  useEffect(() => {
    const opener = (window.opener ?? null) as WindowLike | null;
    return startDeskReceive({
      opener,
      clearOpener: () => {
        try {
          window.opener = null;
        } catch {
          /* 브라우저가 막으면 그대로 둔다 */
        }
      },
      listen: (fn) => {
        const h = (e: MessageEvent) => fn({ origin: e.origin, source: e.source, data: e.data });
        window.addEventListener("message", h);
        return () => window.removeEventListener("message", h);
      },
      setTimer: (fn, ms) => window.setTimeout(fn, ms),
      clearTimer: (t) => window.clearTimeout(t as number),
      now: () => Date.now(),
      newId: () => crypto.randomUUID(),
      getAcct: () => getHandoffAcct(),
      onCandidate: (p) => {
        setRejected(false);
        setCandidate(p);
      },
      onRejected: () => setRejected(true),
    });
  }, []);

  const clear = useCallback(() => setCandidate(null), []);
  const similar = useMemo(() => (candidate ? findSimilar(candidate, mine) : []), [candidate, mine]);

  return (
    <>
      {rejected && <p className="mx-card p-4 text-sm text-mx-danger">받은 값이 올바르지 않아 채우지 않았어요(저장된 것 없음). 매물 알림에서 다시 눌러 주세요.</p>}
      {candidate && (
        <div className="mx-card space-y-2 p-4 text-sm">
          <p className="font-bold text-mx-text">🏠 매물 알림에서 온 <b>미저장 후보</b>예요 — 아직 저장되지 않았어요.</p>
          <p className="text-mx-muted">중개사·전화번호·매물 번호는 넘어오지 않아요. 소재지에 <b>동 이름·지번</b>을 보완하고, 의뢰를 받은 매물일 때만 「후보로 저장」해 주세요.</p>
          {similar.length > 0 && (
            <p className="text-mx-danger">
              ⚠ 비슷한 매물이 이미 있어요:{" "}
              {similar.slice(0, 3).map((l, i) => (
                <span key={l.id}>
                  {i > 0 && ", "}
                  <Link href={`/listings/${encodeURIComponent(l.id)}`} className="underline">{l.title}</Link>
                </span>
              ))}
              {" "}(저장은 막지 않아요)
            </p>
          )}
          <button type="button" onClick={clear} className="mx-btn-ghost min-h-[40px] px-3 text-xs">후보 비우기</button>
        </div>
      )}
      <AddListingForm candidate={candidate} onSaved={clear} />
    </>
  );
}
