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
      <div className="rounded-2xl border border-[#202945] bg-[#13182c] p-8 text-center text-sm text-slate-400 shadow-xl">
        <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[#181f38] border border-[#202945] flex items-center justify-center text-rose-500">
          <Film className="w-6 h-6" />
        </div>
        <p className="font-bold text-white">아직 수집된 쇼츠 주제가 없습니다.</p>
        <p className="mt-1 text-xs text-slate-400">위의 수집 도구에서 URL, RSS 또는 Perplexity 트렌드로 첫 쇼츠 아이디어를 추출해보세요.</p>
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
            className="rounded-2xl border border-[#202945] bg-[#13182c] p-4.5 hover:border-rose-500/40 transition-all shadow-lg group"
          >
            <div className="mb-2 flex items-start justify-between gap-3">
              <h3 className="text-sm font-bold text-white group-hover:text-rose-200 transition-colors leading-snug">
                {c.title}
              </h3>
              <div className="flex shrink-0 items-center gap-2">
                {videoId ? (
                  <Link
                    href={`/scripts/${videoId}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 px-3 py-1.5 text-xs font-bold text-rose-300 transition-colors"
                  >
                    <Film className="w-3.5 h-3.5" />
                    <span>영상스크립트 보기</span>
                  </Link>
                ) : (
                  <form action={generateScriptAction}>
                    <input type="hidden" name="candidateId" value={c.id} />
                    <button
                      type="submit"
                      className="btn-3d-rec px-3 py-1.5 text-xs font-bold shadow-md"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>스크립트 생성</span>
                    </button>
                  </form>
                )}
                <form action={deleteCandidateAction}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    type="submit"
                    title="주제 삭제"
                    className="inline-flex items-center justify-center rounded-lg border border-[#202945] bg-[#0f1325] hover:bg-rose-950/50 hover:text-rose-400 p-1.5 text-xs text-slate-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>

            {c.hook && (
              <div className="mb-2.5 rounded-xl bg-[#0f1325] border-l-3 border-rose-500 px-3.5 py-2 text-xs font-semibold text-rose-300 shadow-inner">
                &ldquo;{c.hook}&rdquo;
              </div>
            )}

            <p className="whitespace-pre-wrap text-xs text-slate-300 leading-relaxed">
              {c.content}
            </p>

            {c.keywords && c.keywords.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {c.keywords.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center gap-1 rounded-full bg-[#181f38] border border-[#202945] px-2.5 py-0.5 text-[11px] font-medium text-slate-300"
                  >
                    <Hash className="w-2.5 h-2.5 text-rose-400" />
                    {k}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-3 pt-2.5 border-t border-[#202945] flex items-center justify-between text-[11px] text-slate-400">
              <span className="font-medium text-slate-300">
                {SOURCE_LABELS[c.source_type]} · {c.source_input}
              </span>
              <span className="inline-flex items-center gap-1 font-mono">
                <Clock className="w-3 h-3 text-slate-500" />
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
