// 2026-10-21 이미지 병합 B(v1.09): AI 올인원 그래픽은 「AI 바나나 캔버스 자동화 → 📐 템플릿 그래픽」으로 합쳐졌다. 이 앱은 안내만 한다(주소 유지).
// 원래 작업실(AllInOneGraphicApp)은 결과를 저장하지 않아 옮길 회원 자료가 없다.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

const NEW_URL = "https://banana-canvas.buylife.xyz/studio#card-graphic";

export default function HomePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 px-4 text-slate-100">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-700 bg-slate-950 p-6 text-center">
        <p className="text-3xl">📐</p>
        <h1 className="text-lg font-bold">AI 올인원 그래픽이 「AI 바나나 캔버스 자동화」로 옮겨졌습니다</h1>
        <p className="text-sm leading-relaxed text-slate-300">
          19개 직군 123종 템플릿, 기획서·메모로 칸 자동 입력, 화풍 11종·글자 언어·해상도 선택은 이제
          <strong className="text-amber-400"> 바나나 캔버스 → 📐 템플릿 그래픽</strong>에서 그대로 쓰실 수 있습니다.
          브러시 부분 수정과 비율 확장은 같은 화면의 「빠른 작업」에 있고, 만든 이미지는 결과 기록에 남습니다. 사용 권한도 함께 옮겨 드렸습니다.
        </p>
        <a href={NEW_URL} className="inline-block rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-400">템플릿 그래픽으로 가기</a>
        <p className="text-xs text-slate-400">본인 Gemini 키는 회원 공용 키 저장소에 있어 바나나 캔버스에서도 그대로 쓰입니다.</p>
      </div>
    </main>
  );
}
