import Link from "next/link";
import { deleteCandidateAction } from "@/lib/actions/candidates";
import { generateScriptAction } from "@/lib/actions/scripts";
import type { Database, ShortsSourceType } from "@/types/database.types";
import { Film, Trash2, Sparkles, Hash, Clock } from "lucide-react";

type Candidate = Database["public"]["Tables"]["shorts_candidates"]["Row"];

const SOURCE_LABELS: Record<ShortsSourceType, string> = {
  http: "HTTP URL",
  rss: "RSS 피드",
  perplexity: "Perplexity 검색",
};

interface CandidateListProps {
  candidates: Candidate[];
  videoIdByCandidateId: Map<string, string>;
}

export function CandidateList({ candidates, videoIdByCandidateId }: CandidateListProps) {
  if (candidates.length === 0) {
    return (
      <div className="rounded-xl border border-[#272727] bg-[#181818] p-8 text-center text-sm text-[#aaaaaa]">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-[#272727] flex items-center justify-center text-[#ff4e45]">
          <Film className="w-6 h-6" />
        </div>
        <p className="font-semibold text-[#f1f1f1]">아직 수집된 쇼츠 주제가 없습니다.</p>
        <p className="mt-1 text-xs text-[#717171]">위의 수집 도구에서 URL, RSS 또는 Perplexity 트렌드로 첫 쇼츠 아이디어를 추출해보세요.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-3.5">
      {candidates.map((c) => {
        const videoId = videoIdByCandidateId.get(c.id);
        return (
          <li
            key={c.id}
            className="rounded-xl border border-[#272727] bg-[#181818] p-4 hover:border-[#383838] transition-all shadow-md group"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="text-sm font-bold text-[#f1f1f1] group-hover:text-white transition-colors leading-snug">
                {c.title}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                {videoId ? (
                  <Link
                    href={`/scripts/${videoId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff0000]/15 hover:bg-[#ff0000]/25 border border-[#ff0000]/40 px-2.5 py-1 text-xs font-semibold text-[#ff4e45] transition-colors"
                  >
                    <Film className="w-3 h-3" />
                    <span>영상스크립트 보기</span>
                  </Link>
                ) : (
                  <form action={generateScriptAction}>
                    <input type="hidden" name="candidateId" value={c.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#ff0000] hover:bg-[#cc0000] px-2.5 py-1 text-xs font-semibold text-white shadow transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>영상스크립트 생성</span>
                    </button>
                  </form>
                )}
                <form action={deleteCandidateAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    title="주제 삭제"
                    className="inline-flex items-center justify-center rounded-lg bg-[#272727] hover:bg-rose-950/50 hover:text-rose-400 p-1.5 text-xs text-[#717171] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {c.hook && (
              <div className="mb-2.5 rounded-lg bg-[#222222] border-l-2 border-[#ff0000] px-3 py-1.5 text-xs font-medium italic text-[#ff7970]">
                &ldquo;{c.hook}&rdquo;
              </div>
            )}

            <p className="whitespace-pre-wrap text-xs text-[#cccccc] leading-relaxed">
              {c.content}
            </p>

            {c.keywords && c.keywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.keywords.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded-full bg-[#272727] border border-[#333333] px-2.5 py-0.5 text-[11px] font-medium text-[#aaaaaa]"
                  >
                    <Hash className="w-2.5 h-2.5 text-[#ff4e45]" />
                    {k}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 pt-2.5 border-t border-[#252525] flex items-center justify-between text-[11px] text-[#717171]">
              <span className="font-medium text-[#aaaaaa]">
                {SOURCE_LABELS[c.source_type]} · {c.source_input}
              </span>
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(c.created_at).toLocaleString("ko-KR", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
