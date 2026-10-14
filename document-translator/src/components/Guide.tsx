import { LANGUAGES } from "@/lib/translation/model";
export function Guide() {
  return (
    <div className="guide-grid">
      <section className="card">
        <h2>1. 원문 준비</h2>
        <p>
          텍스트를 입력하거나 TXT·PDF·DOCX를 불러옵니다. 파일은 기기 안에서
          읽으며 선택만으로 AI를 호출하지 않습니다.
        </p>
        <p>
          파일당5MB, PDF50페이지, 원문20,000자까지 지원합니다. 스캔
          PDF·HWP·PPTX·XLSX는 현재 지원하지 않습니다.
        </p>
      </section>
      <section className="card">
        <h2>2. 언어와 용어집 설정</h2>
        <p>
          원문 언어는 자동 감지하거나 직접 선택합니다. 대상 언어와 분야, Gemini
          모델을 확인하세요. 승인한 용어집은 해당 문단에 나타나는 용어부터
          적용됩니다.
        </p>
        <p>{LANGUAGES.map((l) => l.name).join(" · ")}</p>
      </section>
      <section className="card">
        <h2>3. 번역·검수·수정</h2>
        <p>
          문서가 길면 나누어 처리합니다. 실행 전에 예상 호출 수를 확인할 수
          있습니다. 번역 후 문맥·용어·문체를 확인하고 문단별로 수정하세요.
        </p>
        <p>
          원문·언어·모델을 바꾸면 이전 번역은 유지되고 재번역 필요를 표시합니다.
          번역문을 수정하면 ‘현재 수정본 재검수’를 실행하세요.
        </p>
      </section>
      <section className="card">
        <h2>4. 역번역과 비교</h2>
        <p>
          현재 수정한 번역문을 원문 언어로 다시 번역해 확인합니다. 숫자·URL
          점검은 표현 차이도 표시할 수 있으므로 원문과 직접 대조하세요.
        </p>
        <p>
          AI 문체 점수와 역번역은 참고 자료입니다. 중요한 문서는 내용을 직접
          검토하세요.
        </p>
      </section>
      <section className="card">
        <h2>5. 저장과 다운로드</h2>
        <p>
          TXT·Markdown·DOCX로 저장하고, 용어는 TXT·CSV로 내보낼 수 있습니다.
          DOCX는 제목·단순 목록·굵게·기울임·단순 표를 지원합니다. 원본의
          이미지·복잡한 배치는 재현하지 않습니다.
        </p>
        <p>
          프로젝트 JSON 백업은 키를 포함하지 않습니다. 불러온 백업은 새 작업이며
          보관함에 자동 저장되지 않습니다.
        </p>
      </section>
      <section className="card">
        <h2>회원님의 데이터와 사용량</h2>
        <p>
          본인 Gemini 키로 요청하며 원문과 현재 번역문이 AI에 전달됩니다. 파일
          원본은 서버에 저장하지 않습니다. 보관함 저장을 선택한
          작업만30일·최대100건 보관합니다.
        </p>
        <p>
          저장하지 않은 작업은 새로고침하면 사라질 수 있습니다. AI 실행 중
          취소해도 이미 시작한 호출의 비용은 취소되지 않을 수 있습니다. 실패 후
          직접 재실행하면 추가 사용량이 발생할 수 있습니다.
        </p>
      </section>
    </div>
  );
}
