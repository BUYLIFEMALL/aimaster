// 🔑 키 화면 안내문 — 2026-11-18 WS-20261118-04: 별도 페이지(/settings/keys)와 워크스페이스 안 화면(/<domain>/keys)이 같이 쓰도록 page.tsx에서 그대로 옮김(문구 변경 0).
export function KeysTip() {
  return (
    <section className="aww-tip">
      💡 AI 비서(AI 질문·글쓰기·AI 블록·자동 채우기)는 <b>회원 본인의 Claude·OpenAI·Gemini API 키 중 하나</b>로만 동작합니다. 사용료는 본인 키로 청구되며, 다른 AIMaster 프로그램이나 메인 사이트 「API 설정」에서 이미 등록한 키가 있으면 그대로 쓰입니다. 여러 키가 있으면 「자동」은 Claude → OpenAI → Gemini 순서로 쓰고, 채팅의 모델 목록에서 원하는 회사 모델을 직접 고를 수도 있습니다. AI 채팅 기록은 1년이 지나면 자동으로 지워집니다(내가 쓴 페이지·데이터베이스는 그대로). 페이지에 올린 음악·영상 파일은 30일 뒤 지워집니다.
    </section>
  );
}

export function KeysWarn() {
  return (
    <section className="aww-warn">
      ⚠️ 키는 다른 사람에게 보여 주지 마세요. 저장한 키는 앞뒤 몇 글자만 화면에 보이며, 바꾸거나 지우면 1분 안에 반영됩니다.
    </section>
  );
}
