const STEPS: [string, string][] = [
  ["AI 키 등록 (선택)", "AI 로직 생성기를 쓰려면 왼쪽 메뉴 API키등록·플랫폼연동에서 본인의 Gemini(또는 OpenAI·Claude) 키를 등록합니다. 프리셋과 수동 조정만 쓸 때는 키가 필요 없습니다."],
  ["WAV 올리기", "44.1kHz/16bit 이상의 고음질 WAV를 끌어다 놓거나 선택합니다. 여러 곡을 한 번에 올려 같은 설정으로 일괄 처리할 수 있습니다."],
  ["사운드 프로필 고르기", "범용·스트리밍·클럽용·파이어·펀치·선명함·팟캐스트·빈티지 온기·테이프·내추럴·공간감·시네마틱 12가지 중 하나를 누르면 마스터링 랙 값이 바뀝니다."],
  ["AI 로직 생성기", "‘선명한 고음과 깊은 저음 펀치감이 있는 현대적인 K-Pop’처럼 원하는 소리를 적으면 AI가 설정값과 짧은 설명을 제안합니다. 제안값은 안전한 범위로 보정되어 랙에 채워집니다."],
  ["정밀 마스터링 랙", "EQ(저·중·고, Q), 아날로그 새추레이션, 컴프레서, 스테레오 이미저, 최종 리미터를 슬라이더로 미세 조정합니다."],
  ["처리와 저장", "‘전체 일괄 처리’를 누르면 모든 곡을 처리합니다. 곡별 WAV 저장 또는 전체 ZIP 다운로드가 가능합니다. 설정을 바꾸면 ‘다시 처리하세요’ 안내가 나옵니다."],
];
const TIPS = [
  "오디오 파일은 서버로 전송되지 않고 이 브라우저 안에서만 처리됩니다. 창을 닫거나 새로고침하면 올린 곡과 결과가 사라지니 처리 후 꼭 저장하세요.",
  "결과 WAV는 16bit PCM이며, 마지막 리미터가 실링(기본 -1.0dBFS) 아래로 최대 레벨을 맞춥니다. 입력과 결과의 피크·평균(RMS) 레벨이 파형 아래에 표시됩니다.",
  "처리 속도와 메모리는 곡 길이에 비례합니다. 긴 곡이 많으면 나눠서 처리하세요. 파일 하나는 150MB 이하여야 합니다.",
  "AI 호출 비용은 회원님 본인의 키로 나갑니다. 운영자나 다른 회원의 키는 쓰이지 않습니다.",
  "이 도구는 소리를 다듬는 보조 도구입니다. 최종 음량·음색은 반드시 직접 들어 보고 판단하세요.",
];

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <h1 className="text-xl font-bold text-neutral-900">사용 안내</h1>
      <ol className="space-y-3">
        {STEPS.map(([t, d], i) => (
          <li key={t} className="flex gap-3 rounded-xl border border-neutral-200 bg-white p-4">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white">{i + 1}</span>
            <div>
              <p className="text-sm font-bold text-neutral-900">{t}</p>
              <p className="mt-0.5 text-sm text-neutral-600">{d}</p>
            </div>
          </li>
        ))}
      </ol>
      <section className="rounded-xl border border-neutral-200 bg-white p-4">
        <h2 className="mb-2 text-sm font-bold text-neutral-900">알아두면 좋은 점</h2>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
          {TIPS.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </section>
    </div>
  );
}
