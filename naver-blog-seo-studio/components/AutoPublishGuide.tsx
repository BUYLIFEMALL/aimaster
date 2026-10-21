"use client";
import { useState } from "react";

const steps = [
  ["원고 준비", "웹에서 제목·본문·사진·카테고리를 저장하고 원고를 확장으로 보내세요.", "미리보기에서 전체 내용을 확인합니다. 새 유료 이미지를 만들 필요는 없으며 이미지가 있는 원고는 저장된 사진을 모두 불러와야 합니다."],
  ["대상과 공개 범위", "확장에서 실제 블로그 ID와 비공개/전체공개를 선택합니다.", "블로그 주소의 ID는 로그인 ID와 다를 수 있습니다. 자동 포스팅은 새 전용 탭을 열며 기존 준비 원고는 사용하지 않습니다."],
  ["자동 포스팅 실행", "‘선택한 원고 자동 포스팅 시작’을 한 번 누릅니다.", "제목·전체 본문·사진 수와 공개 설정 확인 후 최종 발행까지 자동으로 진행합니다. 실행 원고는 수정·삭제가 잠기며 즉시 발행만 지원합니다."],
  ["게시 결과 확인", "발행된 글 링크와 생성 기록의 ‘실제 발행 완료’를 확인합니다.", "응답이 끊겼다면 ‘발행 결과만 다시 확인’을 누르세요. 결과 불확실 상태에서는 최종 버튼을 다시 누르지 않습니다."],
];
export default function AutoPublishGuide() {
  const [step, setStep] = useState(0), [notice, setNotice] = useState("");
  const rule = "내 원고 저장 → 실제 블로그 ID·공개 범위 확인 → 자동 포스팅 1회 → 실제 게시 URL·서버 기록 확인. 결과 불확실 시 재발행 금지, 결과 확인만 재실행.";
  return <section className="card" aria-labelledby="auto-publish-guide-title">
    <div className="card-head"><h2 id="auto-publish-guide-title">🚀 확장 자동 포스팅</h2><span>약 3분 · 발행 기능 무료 / AI 생성 별도</span><a href="/settings">최신 확장·연동 설정 열기 ↗</a></div>
    <div className="card" style={{ background: "#e8f6ef" }}><h3>원고에서 실제 게시 결과까지</h3><p>검토한 본인 원고를 새 글쓰기 탭에 입력하고 마지막 발행·결과 기록까지 이어갑니다.</p></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 10 }} aria-label="자동 포스팅 안내 단계">
      {steps.map((item, i) => <button key={item[0]} type="button" aria-pressed={step === i} onClick={() => setStep(i)} className={step === i ? "primary" : "secondary"}>STEP {i + 1}<br />{item[0]}</button>)}
    </div>
    <div aria-live="polite"><h3>{step + 1}. {steps[step][0]}</h3><p>{steps[step][1]}</p><p>{steps[step][2]}</p></div>
    <div className="card"><code>{rule}</code><button type="button" onClick={async () => { try { await navigator.clipboard.writeText(rule); setNotice("자동 포스팅 규칙을 복사했습니다."); } catch { setNotice("규칙을 직접 선택해 복사해 주세요."); } }}>규칙 복사</button><p role="status">{notice}</p></div>
    <p className="success">💡 생성 기록의 상태 새로고침으로 서버에 저장된 발행 결과를 다시 확인할 수 있습니다.</p>
    <p className="error">⚠️ 전체공개를 선택하면 실제 공개 게시됩니다. 입력 준비와 발행 완료는 다릅니다. 게시 URL을 확인하기 전에 같은 원고를 다시 실행하지 마세요.</p>
    <a href="https://blog.naver.com/GoBlogWrite.naver" target="_blank" rel="noreferrer">네이버 글쓰기 열기 ↗</a>
  </section>;
}
