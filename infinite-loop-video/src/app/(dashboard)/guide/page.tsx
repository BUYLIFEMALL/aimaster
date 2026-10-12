const STEPS = [
  ["영상 올리기", "동영상을 끌어다 놓거나 눌러서 고릅니다. 50MB 이하, 30초 미만이 가장 빠르고 안정적입니다."],
  ["방식 고르기", "스마트 루프는 가장 닮은 구간을 자동으로 찾습니다. 강제 오버랩은 분석 없이 끝과 처음을 1초 겹칩니다. 바운스는 앞으로 갔다 거꾸로 돌아옵니다."],
  ["다듬기", "최소 루프 길이, 시작·종료 지점(0.01초 단위), 크로스페이드 길이를 조절합니다. 자연스러움 점수가 낮으면 크로스페이드를 늘려 보세요."],
  ["내보내기", "반복 횟수(1~200)와 형식(MP4·WebM·GIF)을 고르고 만들기를 누릅니다. MP4·WebM은 소리도 함께 이어집니다."],
];
const TIPS = [
  "배경이 일정하거나 움직임이 반복되는 영상(파도, 불꽃, 걷기, 회전)일수록 자연스럽게 이어집니다.",
  "카메라가 크게 움직이거나 장면이 바뀌는 영상은 점수가 낮을 수 있습니다. 이때는 크로스페이드를 길게 하세요.",
  "GIF는 파일이 커지기 쉬워 480px 폭으로 줄여 1회분만 저장하며, 소리는 들어가지 않습니다.",
  "모든 처리는 이 기기의 브라우저 안에서만 이뤄집니다. 영상이 서버로 전송되지 않고, API 키도 필요 없습니다.",
  "처음 만들 때 변환 엔진을 한 번 내려받아 시간이 더 걸립니다. 이후에는 빨라집니다.",
];

export default function GuidePage() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-neutral-900">사용 안내</h1>
      <ol className="space-y-3">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">{i + 1}</span>
            <div><p className="text-sm font-bold text-neutral-900">{t}</p><p className="mt-0.5 text-sm text-neutral-600">{d}</p></div>
          </li>
        ))}
      </ol>
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="mb-2 text-sm font-bold text-neutral-900">알아두면 좋은 점</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">{TIPS.map((t) => <li key={t}>{t}</li>)}</ul>
      </div>
    </div>
  );
}
