import { videoStatus, type StoredVideo } from "@/lib/productVideo";

// MOV-20261119-01: 이 상품에 붙인 쇼츠 목록. 로그인한 본인 상품 화면에서만 보인다 —
// 내보내기(긴 이미지·ZIP·HTML)·상품 문구·마켓 등록에는 넣지 않는다. 붙인 영상이 없으면 아무것도 그리지 않는다.
export function ProductVideos({ videos, now }: { videos: StoredVideo[]; now: number }) {
  if (!videos.length) return null;
  return (
    <section className="mt-4 rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-base font-black text-slate-900">🎬 이 상품으로 만든 쇼츠 <span className="text-xs font-medium text-slate-500">({videos.length}개 · 나만 보임)</span></h3>
      <ul className="mt-3 divide-y divide-slate-100">
        {videos.map((v) => {
          const s = videoStatus(v, now);
          return (
            <li key={v.video_id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 break-words">{v.title || "제목 없는 쇼츠"}</p>
                <p className={`mt-0.5 text-xs ${s.kind === "scheduled" || s.kind === "check" ? "text-amber-700" : "text-slate-500"}`}>{s.label}</p>
              </div>
              {s.url && (
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="whitespace-nowrap rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-rose-400 hover:text-rose-600">
                  유튜브에서 보기 ↗
                </a>
              )}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-slate-500">유튜브에서 예약을 바꾸거나 영상을 지워도 여기 기록은 바뀌지 않습니다.</p>
    </section>
  );
}
