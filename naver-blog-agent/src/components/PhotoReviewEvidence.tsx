import type { PhotoReviewResult } from "@/lib/photoReview";

export default function PhotoReviewEvidence({ review }: { review: PhotoReviewResult }) {
  return <details className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed">
    <summary className="cursor-pointer font-bold text-slate-700">근거 대조 · 사진 관찰과 회원 메모</summary>
    <p className="mt-3 text-amber-900">처음 생성한 초안의 참고 자료입니다. 편집한 최종 본문의 사실을 다시 대조해 주세요. {review.warning}</p>
    <p className="mt-3 whitespace-pre-wrap">회원 메모: {review.visitNotes || "입력 없음"}</p>
    {review.observations.map((observation, index) => <div key={observation.id} className="mt-3 space-y-1">
      <p className="font-semibold">사진 {index + 1}{observation.id === review.coverId ? " · 대표" : ""}</p>
      <p className="whitespace-pre-wrap">회원 설명: {review.photos[index].caption || "입력 없음"}</p>
      <p className="whitespace-pre-wrap">AI 관찰: {observation.visible}</p>
      <p className="text-amber-800">알 수 없는 내용: {observation.uncertain.join(" · ") || "AI가 별도 표시하지 않았습니다. 직접 확인해 주세요."}</p>
    </div>)}
    {review.paragraphs.map((item, index) => <p key={index} className="mt-2 break-words">초기 문단 {index + 1} 근거: {item.evidence.map(id => id === "member-notes" ? "회원 메모·사진 설명" : `사진 ${review.photos.findIndex(photo => photo.id === id) + 1}`).join(" · ")}</p>)}
    {review.confirm.map((item, index) => <p key={index} className="mt-2 text-amber-900">확인 필요: {item}</p>)}
  </details>;
}
