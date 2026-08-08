import Link from "next/link";
import { deleteCandidateAction } from "@/lib/actions/candidates";
import type { Database, ThreadsSourceType } from "@/types/database.types";

type Candidate = Database["public"]["Tables"]["threads_candidates"]["Row"];

const SOURCE_LABELS: Record<ThreadsSourceType, string> = {
  http: "HTTP",
  rss: "RSS",
  perplexity: "Perplexity",
};

interface CandidateListProps {
  candidates: Candidate[];
}

export function CandidateList({ candidates }: CandidateListProps) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500">
        아직 수집된 게시글 주제가 없습니다. 위에서 방식을 선택해 첫 주제를 만들어보세요.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {candidates.map((c) => {
        const writeParams = new URLSearchParams({ topic: c.title, candidateId: c.id });
        if (c.content) {
          writeParams.set("content", c.content);
        }
        if (c.keywords && c.keywords.length > 0) {
          writeParams.set("keywords", c.keywords.join(","));
        }
        return (
          <li key={c.id} className="rounded-lg border border-neutral-200 bg-white p-4">
            <div className="mb-1 flex items-start justify-between gap-3">
              <h3 className="text-sm font-semibold text-neutral-900">{c.title}</h3>
              <div className="flex shrink-0 items-center gap-2">
                <Link
                  href={`/posts/new?${writeParams.toString()}`}
                  className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-600 hover:bg-blue-100"
                >
                  이 주제로 글쓰기
                </Link>
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
