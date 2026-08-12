import Link from "next/link";
import { deleteCandidateAction } from "@/lib/actions/candidates";
import { DeleteButton } from "@/components/posts/DeleteButton";
import type { Database, InstaSourceType } from "@/types/database.types";

type Candidate = Database["public"]["Tables"]["insta_candidates"]["Row"];

const SOURCE_LABELS: Record<InstaSourceType, string> = {
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
        // 캡션/해시태그/키워드는 URL에 싣지 않고 candidateId로만 전달한다. 후보 캡션은
        // 900~1400자 이상일 수 있어(콘텐츠 분량 보강 이후) 전부 쿼리 파라미터에 넣으면
        // URL이 수천 자까지 길어져, "게시글 생성하기" 클릭 시 그 URL로 보내는 Server Action
        // 요청이 브라우저/네트워크 단에서 조용히 실패하는 문제가 있었다(2026-08-13 확인).
        // posts/new 페이지가 candidateId로 DB에서 직접 캡션/해시태그/키워드를 다시 조회한다.
        const writeParams = new URLSearchParams({ topic: c.title, candidateId: c.id });
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
                  <DeleteButton />
                </form>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm text-neutral-700">{c.caption}</p>
            {c.hashtags && c.hashtags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {c.hashtags.map((h) => (
                  <span key={h} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                    #{h}
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
