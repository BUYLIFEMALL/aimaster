const STEPS: [string, string][] = [
  ["Gemini 키 등록", "왼쪽 메뉴 API키등록·플랫폼연동에서 본인의 Google Gemini API 키를 한 번 등록합니다. 매뉴얼 버튼으로 발급 방법을 따라 하실 수 있습니다."],
  ["페르소나 고르기", "왼쪽 목록에서 캐릭터를 누르면 그 캐릭터의 말투와 문체, 슬라이더 값이 적용됩니다. 한 번 더 누르면 선택이 풀립니다. 새 페르소나는 이름과 역할만 넣고 AI로 상세 설정을 자동 생성할 수 있습니다."],
  ["이퀄라이저 조절", "오른쪽 슬라이더 5개(창의성·명확성·감정 깊이·길이·전문성)를 움직이거나 프리셋을 누릅니다. 키보드 방향키로도 조절됩니다."],
  ["글 쓰고 생성", "가운데 캔버스에 다시 쓸 글을 넣고 명작 생성을 누릅니다. 결과가 마음에 들지 않으면 되돌리기로 이전 글로 돌아갑니다."],
  ["저장과 불러오기", "초안 저장은 내 계정에 저장하고 txt 파일로도 내려받습니다. 불러오기에서 저장한 초안이나 내 컴퓨터의 파일을 열 수 있습니다."],
];
const TIPS = [
  "창의성을 높이고 명확성을 낮추면 더 은유적이고 추상적인 글이 됩니다.",
  "길이 슬라이더는 원문 대비 분량을 정합니다. 중간(50)은 비슷한 길이, 100은 약 2배, 0은 약 30%입니다.",
  "글은 한 번에 8,000자까지 다시 쓸 수 있습니다. 긴 글은 나누어서 넣어 주세요.",
  "AI 호출은 회원님 본인의 Gemini 키로 이루어지므로 사용량과 비용은 본인 Google 계정 기준입니다.",
  "페르소나는 내보내기로 JSON 파일에 백업하고 가져오기로 복원할 수 있습니다.",
];

export default function GuidePage() {
  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-xl font-bold text-neutral-900">사용 안내</h1>
      <ol className="space-y-3">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-600 text-sm font-bold text-white">{i + 1}</span>
            <div>
              <p className="text-sm font-bold text-neutral-900">{t}</p>
              <p className="mt-0.5 text-sm text-neutral-600">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="mb-2 text-sm font-bold text-neutral-900">알아두면 좋은 점</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
          {TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
