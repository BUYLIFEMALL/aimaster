const STEPS: [string, string][] = [
  ["AI 키 등록", "왼쪽 메뉴 API키등록·플랫폼연동에서 본인의 Google Gemini 키를 먼저 등록합니다. OpenAI·Claude 키는 선택이며, 등록하면 텍스트 생성 모델로 고를 수 있습니다. 매뉴얼 버튼으로 발급 방법을 따라 하실 수 있습니다."],
  ["장르 선택", "10개 장르 카드 중 하나를 고르거나 원하는 장르를 직접 입력합니다."],
  ["제목 선택", "AI가 'playlist 이모지 한국어 문장 | 영어키워드 & 영어키워드' 형식의 제목 10개를 제안합니다. 마음에 드는 제목을 고르거나 직접 고쳐 쓸 수 있습니다."],
  ["Suno 프롬프트", "선택한 제목에 맞는 Suno 5.0 스타일 프롬프트 3종(각 900자 미만)을 받아 Suno에 붙여 넣습니다."],
  ["가사", "언어(한국어·영어·일본어·스페인어·프랑스어), 이중 언어 비율, 곡 수(1~20), 비유 강도, 곡 구조, 인트로/아웃트로 가사, 연주곡 모드를 정하면 곡별 가사를 만들어 줍니다."],
  ["유튜브 메타데이터", "설명글, 해시태그 5개(#playlist가 맨 앞), 검색 키워드 15개를 한 번에 복사해 업로드 화면에 붙여 넣습니다."],
  ["썸네일", "스타일 7종 중 하나를 고르고 필요하면 인물 참고 이미지를 올려 배경 이미지를 만든 뒤, 글꼴 14종·크기·색·굵기로 제목 글자를 얹어 PNG/JPG로 저장합니다. 마음에 들지 않으면 수정 요청을 적어 다시 만들 수 있습니다."],
];
const TIPS = [
  "AI 호출은 모두 회원님 본인의 키로 이루어지므로 사용량과 비용은 본인 계정 기준입니다. 운영자나 다른 회원의 키는 쓰이지 않습니다.",
  "Claude는 이미지를 만들지 못하므로 썸네일은 Gemini 또는 OpenAI(gpt-image-1) 키가 필요합니다.",
  "썸네일 이미지에는 글자를 넣지 않고, 글자는 화면에서 따로 얹습니다. 그래서 한글이 깨지지 않습니다.",
  "제목을 바꾸면 그 제목에 맞춘 Suno 프롬프트·가사·설명·썸네일은 새로 만들어야 하므로 비워집니다.",
  "만든 결과는 내 프로젝트에 저장됩니다(최대 30개). 오래된 프로젝트는 삭제해서 공간을 비우세요.",
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
