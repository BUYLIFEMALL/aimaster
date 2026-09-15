import Link from "next/link";
import { deleteCandidateAction, setCandidateUseForScheduleAction } from "@/lib/actions/candidates";
import { DeleteButton } from "@/components/posts/DeleteButton";
import { CandidateScheduleToggleButton } from "@/components/candidates/CandidateScheduleToggleButton";
import { CANDIDATE_SOURCE_LABELS, type CafeCandidate, type CandidateSourceType } from "@/types/post";

interface CandidateListProps {
  candidates: CafeCandidate[];
}

export function CandidateList({ candidates }: CandidateListProps) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        아직 수집된 게시글 후보가 없습니다. 위에서 방식을 선택해 첫 후보를 만들어보세요.
      </div>
    );
  }

  return (
    <>
      <p className="mb-3 text-xs text-neutral-500">
        각 후보의 "🎲 예약용 ON/OFF"를 켜두면, 예약 자동화의 "🎲 후보함에서 랜덤 선택" 소스가
        ON인 후보 중 하나를 무작위로 골라 카페 게시글을 만듭니다. 한 번 쓰인 후보는 자동으로
        OFF로 바뀌어 중복 게시되지 않습니다.
      </p>
      <ul className="space-y-3">
        {candidates.map((c) => {
        const writeParams = new URLSearchParams({ title: c.title });
        if (c.content) {
          writeParams.set("content", c.content);
        }
        return (
          <li key={c.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-1 flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-neutral-900">{c.title}</h3>
              <div className="flex shrink-0 items-center gap-2">
                <form action={setCandidateUseForScheduleAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="useForSchedule" value={String(!c.use_for_schedule)} />
                  <CandidateScheduleToggleButton on={c.use_for_schedule} />
                </form>
                <Link
                  href={`/drafts?${writeParams.toString()}`}
                  className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                >
                  이 후보로 초안 만들기
                </Link>
                <form action={deleteCandidateAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <DeleteButton />
                </form>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm text-neutral-700">{c.content}</p>
            {c.keywords && c.keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {c.keywords.map((k) => (
                  <span key={k} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    #{k}
                  </span>
                ))}
              </div>
            )}
            <p className="mt-2 text-xs text-neutral-400">
              {CANDIDATE_SOURCE_LABELS[c.source_type as CandidateSourceType]} · {c.source_input} ·{" "}
              {new Date(c.created_at).toLocaleString("ko-KR")}
            </p>
          </li>
        );
        })}
      </ul>
    </>
  );
}
