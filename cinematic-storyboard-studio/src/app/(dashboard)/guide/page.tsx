import { GLOSSARY } from "@/lib/storyboard/glossary";

const STEPS: [string, string][] = [
  ["Gemini 키 등록", "왼쪽 메뉴 API키등록·플랫폼연동에서 본인의 Google Gemini API 키를 한 번 등록합니다. 매뉴얼 버튼으로 발급 방법을 따라 하실 수 있습니다."],
  ["이미지 올리기와 주제", "레퍼런스 이미지를 올리고, 원하는 주제(로그라인)가 있으면 적습니다. 막막하면 AI 제안을 눌러 이미지에 맞는 한 문장을 받을 수 있습니다."],
  ["스토리보드 생성", "AI가 구도·조명·피사체를 분석해 4단계 감정선과 키프레임 9컷을 설계한 뒤, 9컷이 한 장에 담긴 마스터 시트를 그립니다. 고화질이 필요하면 Pro 엔진을 고르세요(본인 Google 계정에 결제 연결 필요)."],
  ["자르기와 저장", "마스터 이미지를 저장하거나, 자르기 및 다운로드에서 3×3 경계를 슬라이더로 맞춰 9장을 ZIP으로 받습니다."],
  ["영상 프롬프트", "영상 길이(5·8·10·15초)와 대사 언어를 고르고 만들면, Runway·Kling·Luma·Veo·Sora 같은 영상 AI에 붙여 넣을 마스터 프롬프트와 장면별 프롬프트, JSON을 받을 수 있습니다."],
];
const TIPS = [
  "장면 1은 업로드한 이미지를 영상 AI의 시작 이미지(Start Image)로 쓰도록 설계됩니다. 그래서 정지 샷이나 아주 느린 줌으로 시작합니다.",
  "장면 길이는 총 길이에 맞게 자동으로 배분되어 합이 정확히 맞습니다.",
  "만든 결과는 내 프로젝트에 저장됩니다(최대 30개). 오래된 프로젝트는 삭제해서 공간을 비우세요.",
  "AI 호출은 모두 회원님 본인의 Gemini 키로 이루어지므로 사용량과 비용은 본인 Google 계정 기준입니다.",
  "사람이 나오는 이미지는 영상으로 만들 때 AI 서비스의 정책(실존 인물 등)에 걸릴 수 있습니다.",
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
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="mb-2 text-sm font-bold text-neutral-900">알아두면 좋은 점</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-600">
          {TIPS.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <div className="rounded-xl border border-neutral-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-neutral-900">촬영 용어 사전</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="rounded-lg bg-neutral-50 p-3">
              <p className="text-sm font-bold text-indigo-700">
                {g.term} <span className="text-xs font-normal text-neutral-400">{g.full}</span>
              </p>
              <p className="mt-0.5 text-xs text-neutral-600">{g.ko}</p>
              <p className="text-[11px] text-neutral-400">{g.en}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
