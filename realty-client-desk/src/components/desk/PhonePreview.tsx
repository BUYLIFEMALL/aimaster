// U-1(2026-11-19, docs/PLAN_20261119_DESK_CANDIDATES.md) — 「고객이 받는 모양」을 휴대폰 문자 말풍선 틀로 보여 준다.
// 표시만 바꾼다: 글자는 부모가 만든 미리보기(머리말+본문+맺음말) 그대로이고, 발송·고객 선택·권한 경로는 건드리지 않는다.
// 고객 이름·번호는 넣지 않는다(사무소 이름은 법정 머리말 줄에만 들어감). 긴 주소·긴 낱말도 틀 밖으로 넘치지 않게 줄을 바꾼다.
// 2026-11-19 보완(msg_35ee60d64d1e): 단문·장문 구분은 발송 쪽(글자 수·바이트 기준)이 정하므로 이 틀은 SMS/LMS를 표시하지 않는다(중립 「미리보기」 배지만).

export function PhonePreview({ text }: { text: string }) {
  return (
    <div className="mx-auto w-full max-w-[320px] rounded-[2rem] border-[6px] border-[#1f2933] bg-[#1f2933] shadow-sm" aria-label="휴대폰 문자 미리보기">
      <div className="flex items-center justify-between rounded-t-[1.6rem] bg-[#f2f4f7] px-4 pb-2 pt-3 text-[11px] text-[#52606d]">
        <span className="truncate font-semibold text-[#1f2933]">내 발신 번호 → 고객</span>
        <span className="shrink-0 rounded bg-[#e4e7eb] px-1.5 py-0.5">미리보기</span>
      </div>
      <div className="min-h-[220px] rounded-b-[1.6rem] bg-white px-3 py-4">
        <p className="mb-2 text-center text-[10px] text-[#9aa5b1]">문자 메시지 · 미리보기</p>
        <div className="max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-[#e9edf2] px-3 py-2 text-[13px] leading-relaxed text-[#1f2933] [overflow-wrap:anywhere]">
          {text}
        </div>
      </div>
    </div>
  );
}
