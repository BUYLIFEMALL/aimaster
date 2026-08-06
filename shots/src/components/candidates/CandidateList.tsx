import Link from "next/link";
import { deleteCandidateAction } from "@/lib/actions/candidates";
import { generateScriptAction } from "@/lib/actions/scripts";
import type { Database, ShortsSourceType } from "@/types/database.types";

type Candidate = Database["public"]["Tables"]["shorts_candidates"]["Row"];

const SOURCE_LABELS: Record<ShortsSourceType, string> = {
  http: "HTTP",
  rss: "RSS",
  perplexity: "Perplexity",
};

interface CandidateListProps {
  candidates: Candidate[];
  videoIdByCandidateId: Map<string, string>;
}

export function CandidateList({ candidates, videoIdByCandidateId }: CandidateListProps) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        아직 수집된 쇼츠 주제가 없습니다. 위에서 방식을 선택해 첫 주제를 만들어보세요.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {candidates.map((c) => {
        const videoId = videoIdByCandidateId.get(c.id);
        return (
        <li key={c.id} className="rounded-lg border border-neutral-200 bg-white p-4">
          <div className="mb-1 flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-neutral-900">{c.title}</h3>
            <div className="flex shrink-0 items-center gap-2">
              {videoId ? (
                <Link
                  href={`/scripts/${videoId}`}
                  className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                >
                  영상스크립트 보기
                </Link>
              ) : (
                <form action={generateScriptAction}>
                  <input type="hidden" name="candidateId" value={c.id} />
                  <button
                    type="submit"
                    className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                  >
                    영상스크립트 생성
                  </button>
                </form>
              )}
              <form action={deleteCandidateAction}>
                <input type="hidden" name="id" value={c.id} />
                <button
                  type="submit"
                  className="rounded-md bg-red-50 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-100"
                >
                  삭제
                </button>
              </form>
            </div>
          </div>
          {c.hook && <p className="mb-2 text-sm italic text-neutral-500">&ldquo;{c.hook}&rdquo;</p>}
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
            {SOURCE_LABELS[c.source_type]} · {c.source_input} · {new Date(c.created_at).toLocaleString("ko-KR")}
          </p>
        </li>
        );
      })}
    </ul>
  );
}
