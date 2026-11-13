// 2026-11-14: 윈도우 11 「스마트 앱 컨트롤」이 서명 없는 설치 파일을 막을 때의 안내(가이드·내 PC 엔진 화면 공용).
// SmartScreen 창과 달리 [실행] 버튼이 없어 「차단 해제」 또는 「끄기」로만 설치할 수 있다.
export function SmartAppControlNotice() {
  return (
    <section className="space-y-3 rounded-2xl border border-rose-500/30 bg-rose-950/10 p-5">
      <h2 className="text-sm font-bold text-rose-200">🛑 「스마트 앱 컨트롤이 … 앱을 차단했습니다」 창이 뜨면</h2>
      <p className="text-xs leading-relaxed text-slate-300">
        윈도우 11의 <b>스마트 앱 컨트롤</b>이 켜져 있으면, 디지털 서명이 없는 프로그램은 「Windows의 PC 보호」 창과 달리 <b>[실행] 버튼 없이</b> 막힙니다. 아래
        순서대로 해 주세요.
      </p>

      <div className="rounded-xl bg-[#202020] p-4 text-white shadow-lg">
        <p className="text-sm font-semibold">스마트 앱 컨트롤이 안전하지 않을 수 있는 앱을 차단했습니다.</p>
        <p className="mt-2 text-[11px] leading-relaxed opacity-80">실행해도 안전한지 확인하기 위해 게시자를 검증할 수 없기 때문에 …AI-Free-Music-Engine-Setup.exe을(를) 차단했습니다.</p>
        <div className="mt-3 flex justify-end">
          <span className="rounded bg-pink-300 px-4 py-1 text-[11px] font-bold text-slate-900">확인</span>
        </div>
      </div>

      <ol className="grid gap-3 sm:grid-cols-2">
        <li className="rounded-xl border border-slate-700 bg-[#0a0f1d] p-4">
          <span className="text-[11px] font-bold text-rose-300">방법 1 · 먼저 해 보기</span>
          <p className="mt-1 text-sm font-bold text-slate-100">📄 파일 「차단 해제」</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            받은 설치 파일을 마우스 오른쪽 버튼으로 눌러 <b>[속성]</b> → 「일반」 탭 맨 아래 <b>「보안: 차단 해제」</b>에 체크 → <b>[확인]</b>. 다시 더블클릭합니다. 그래도
            막히면 방법 2로 넘어갑니다.
          </p>
        </li>
        <li className="rounded-xl border border-slate-700 bg-[#0a0f1d] p-4">
          <span className="text-[11px] font-bold text-rose-300">방법 2 · 확실한 방법</span>
          <p className="mt-1 text-sm font-bold text-slate-100">🛡️ 스마트 앱 컨트롤 끄기</p>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            시작 메뉴에서 <b>「Windows 보안」</b> → <b>「앱 및 브라우저 컨트롤」</b> → <b>「스마트 앱 컨트롤 설정」</b> → <b>「끄기」</b>. 그다음 설치 파일을 다시
            실행합니다.
          </p>
        </li>
      </ol>

      <ul className="space-y-1 text-[11px] leading-relaxed text-amber-200/90">
        <li>⚠️ 설치 뒤 엔진(음악 모델·ffmpeg 등)도 서명이 없어 스마트 앱 컨트롤이 켜져 있으면 함께 막힐 수 있습니다. 노래 만들기까지 쓰려면 방법 2가 필요합니다.</li>
        <li>⚠️ 윈도우 버전에 따라 스마트 앱 컨트롤은 한 번 끄면 윈도우를 다시 설치해야 켤 수 있습니다. 꺼도 Windows 보안의 바이러스 검사는 그대로 동작합니다.</li>
        <li>💡 회사 PC처럼 설정이 잠겨 있으면 그 PC 관리자에게 요청해 주세요.</li>
      </ul>
    </section>
  );
}
