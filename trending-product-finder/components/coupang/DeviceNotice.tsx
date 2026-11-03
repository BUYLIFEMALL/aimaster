// 쿠팡 상품소싱기가 어디서 동작하는지(PC 전용·켜 둘 것·모바일은 보기만). 쿠팡 화면 맨 위와 매뉴얼에 같이 쓴다.
export function DeviceNotice() {
  return (
    <section className="rounded-2xl border-2 border-[#2563eb] bg-[#1e3a8a]/30 p-4">
      <p className="text-base font-extrabold text-white">📌 꼭 확인하세요 — 어디서 동작하나요?</p>
      <ul className="mt-2 space-y-1 text-sm font-bold">
        <li className="text-[#bfdbfe]">💻 쿠팡 상품 읽기·자동 검색은 <u>PC에서만</u> 됩니다.</li>
        <li className="text-[#fde68a]">🔌 <u>PC가 켜져 있고 크롬이 열려 있어야</u> 동작합니다. PC를 끄면 멈춥니다.</li>
        <li className="text-[#a7f3d0]">📱 모은 결과는 <u>휴대폰으로도</u> 언제든 볼 수 있습니다.</li>
      </ul>
      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <div className="rounded-xl bg-mx-raised p-3">
          <p className="text-sm font-bold text-mx-text">💻 PC — 읽기·자동 검색 ✅</p>
          <p className="mt-1 text-xs leading-relaxed text-mx-muted">크롬에 확장을 설치한 PC에서 쿠팡 화면을 읽습니다. 같은 방식으로 확장을 설치할 수 있는 엣지·웨일도 됩니다.</p>
        </div>
        <div className="rounded-xl border border-[#f59e0b] bg-[#78350f]/40 p-3">
          <p className="text-sm font-bold text-[#fde68a]">🔌 PC와 크롬을 켜 두세요</p>
          <p className="mt-1 text-xs leading-relaxed text-[#fef3c7]">
            자동 검색은 <b>PC가 켜져 있고 크롬이 열려 있는 동안에만</b> 돕니다. PC를 끄거나 절전에 들어가거나 크롬을 닫으면 그 자리에서 멈춥니다. 확장 창은 닫아도 됩니다.
          </p>
        </div>
        <div className="rounded-xl border border-[#10b981] bg-[#064e3b]/40 p-3">
          <p className="text-sm font-bold text-[#a7f3d0]">📱 결과는 휴대폰으로 언제든 보기 ✅</p>
          <p className="mt-1 text-xs leading-relaxed text-[#d1fae5]">
            PC에서 모은 결과는 <b>내 계정에 저장</b>되어, 밖에서도 휴대폰으로 로그인하면 「🗂 내 검색 기록」에서 보고 거르고 CSV를 받을 수 있습니다. 단, 휴대폰에는 확장을 설치할 수 없어 쿠팡 읽기는 PC에서 합니다.
          </p>
        </div>
      </div>
    </section>
  );
}
