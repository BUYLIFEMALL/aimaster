// 2026-10-21 병합 B: 페르소나 문체 자동화는 AI 글쓰기 에디터 「🎚️ 문체 바꾸기」로 합쳐졌다. 이 앱은 안내만 한다(주소 유지).
export const NEW_URL = "https://ai-writing-editor.buylife.xyz/dashboard";

export function MovedNotice() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8fafc] px-4 font-sans text-slate-900">
      <div className="w-full max-w-lg space-y-4 rounded-2xl border border-slate-200 bg-white p-6 text-center">
        <p className="text-3xl">🎚️</p>
        <h1 className="text-lg font-black">페르소나 문체 자동화가 「AI 글쓰기 에디터」로 옮겨졌습니다</h1>
        <p className="text-sm leading-relaxed text-slate-600">
          5개 슬라이더·프리셋 8종·기본 페르소나 10명·나만의 페르소나는 이제 <strong className="text-slate-900">AI 글쓰기 에디터 → 🎚️ 문체 바꾸기</strong>에서 그대로 쓰실 수 있습니다.
          서식 에디터에서 선택한 부분이나 글 전체의 말투를 바꾸고, 문서 저장·글 분석까지 한 곳에서 이어집니다. 사용 권한도 함께 옮겨 드렸습니다.
        </p>
        <a href={NEW_URL} className="inline-block rounded-lg bg-violet-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-violet-800">AI 글쓰기 에디터로 가기</a>
        <p className="text-xs text-slate-500">Gemini 키는 AIMaster 공용 저장소의 본인 키를 그대로 쓰므로 다시 등록하지 않아도 됩니다.</p>
      </div>
    </main>
  );
}
