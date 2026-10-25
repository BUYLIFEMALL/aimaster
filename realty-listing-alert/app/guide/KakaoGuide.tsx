"use client";

// 💬 카카오톡 연결 따라 하기(2026-10-25 주인님 「카카오톡 본인 계정 등록해서 연동하는 방법도 자세하게… 쉽고 단계별」「일반 처음 사용자들은 어려운 내용이야」).
// 처음 쓰는 회원 기준: 어디를 눌러 → 무엇을 복사해 → 어디에 붙여 넣는지만. 카카오 개발자 화면 메뉴 이름은 바뀔 수 있어 「비슷한 이름」 안내를 붙인다.
import { useState } from "react";

const SITE = "https://realty-listing-alert.buylife.xyz";
const REDIRECT = `${SITE}/api/kakao/callback`;

function Copy({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <span className="kg-copy">
      <code>{text}</code>
      <button
        type="button"
        className="secondary"
        onClick={async () => {
          try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { setDone(false); }
        }}
      >{done ? "✅ 복사됨" : "📋 복사"}</button>
    </span>
  );
}

const STAGES = [
  {
    title: "카카오 개발자 사이트에 내 앱 만들기",
    time: "3분",
    steps: [
      <>아래 「카카오 개발자 열기」를 눌러 <b>평소 쓰는 카카오 계정</b>으로 로그인해요. 처음이면 「개발자 등록」 동의 화면이 나오니 동의하고 넘어가요.</>,
      <>위쪽 메뉴 <b>「내 애플리케이션」</b> → <b>「애플리케이션 추가하기」</b>를 눌러요.</>,
      <>앱 이름은 아무거나 괜찮아요(예: <b>내 매물 알림</b>). 회사명 칸에는 <b>본인 이름</b>을 쓰고 저장해요.</>,
    ],
    link: { href: "https://developers.kakao.com/console/app", label: "🟡 카카오 개발자 열기 ↗" },
  },
  {
    title: "열쇠 2개 복사해 두기 (REST API 키 · Client Secret)",
    time: "2분",
    steps: [
      <>방금 만든 앱을 누르면 <b>「앱 키」</b>(또는 「플랫폼 키」) 화면에 키가 여러 개 보여요. 그중 <b>「REST API 키」</b>를 복사해 메모장에 붙여 둬요.</>,
      <>왼쪽 메뉴 <b>「보안」</b>(또는 「카카오 로그인 → 보안」)에서 <b>Client Secret 「코드 생성」</b>을 누르고, 활성화 상태를 <b>「사용함」</b>으로 바꾼 뒤 코드를 복사해 둬요.</>,
      <>💡 이 두 값은 <b>회원님 앱의 열쇠</b>예요. 다른 사람에게 알려 주지 마세요.</>,
    ],
  },
  {
    title: "카카오 로그인 켜고, 돌아올 주소 넣기",
    time: "2분",
    steps: [
      <>왼쪽 메뉴 <b>「카카오 로그인」</b>에서 <b>활성화 설정을 「ON」</b>으로 바꿔요.</>,
      <>같은 화면 아래 <b>「Redirect URI」</b>(돌아올 주소) → 「등록」을 누르고 아래 주소를 <b>그대로</b> 붙여 넣어 저장해요. 이미 다른 주소가 있으면 지우지 말고 <b>한 줄 추가</b>만 해요.</>,
      <Copy key="r" text={REDIRECT} />,
    ],
  },
  {
    title: "「카톡 메시지 보내기」 허락 항목 켜기",
    time: "1분",
    steps: [
      <>왼쪽 메뉴 <b>「카카오 로그인 → 동의항목」</b>에서 <b>「카카오톡 메시지 전송」</b>을 찾아 「설정」을 눌러요.</>,
      <><b>「선택 동의」</b>를 고르고, 사용 목적 칸에 <b>「내 부동산 매물 알림을 나에게 보내기」</b>처럼 적고 저장해요.</>,
    ],
  },
  {
    title: "카톡 「결과 보기」 버튼이 열릴 주소 넣기",
    time: "1분",
    steps: [
      <>왼쪽 메뉴 <b>「앱 설정 → 플랫폼」</b>(또는 「제품 링크 관리 → 웹 도메인」)에서 <b>Web 사이트 도메인</b>에 아래 주소를 추가해요.</>,
      <Copy key="d" text={SITE} />,
      <>이걸 넣어야 카톡의 「결과 보기」를 눌렀을 때 매물 화면이 열려요.</>,
    ],
  },
  {
    title: "이 프로그램에 붙여 넣고 연결하기",
    time: "1분",
    steps: [
      <>왼쪽 메뉴 <b>「3 · 📨 받는 방법」</b> → <b>「💬 카톡으로 받기」</b> 카드로 가요.</>,
      <>2단계에서 복사한 <b>REST API 키</b>와 <b>Client Secret</b>을 칸에 붙여 넣고 「키 저장」을 눌러요.</>,
      <><b>「💬 카카오 연결하기」</b>를 누르면 카카오 화면이 열려요. <b>「동의하고 계속하기」</b>를 누르면 자동으로 돌아오고 「✅ 연결됨」이 보여요.</>,
      <>마지막으로 <b>「카톡 시험 보내기」</b>를 눌러 내 카카오톡 <b>「나와의 채팅」</b>에 메시지가 오면 끝이에요! 🎉</>,
    ],
    link: { href: "/delivery", label: "📨 받는 방법 열기" },
  },
];

const TROUBLE = [
  { q: "카카오 화면에 「KOE006」이나 「Redirect URI」 오류가 나와요.", a: "3단계 돌아올 주소가 등록되지 않았거나 글자가 달라요. 주소를 「📋 복사」로 다시 복사해 그대로 붙여 넣어 주세요(끝에 / 를 붙이지 않아요)." },
  { q: "「앱 키가 올바르지 않다」거나 로그인 화면이 안 열려요.", a: "REST API 키 대신 다른 키(JavaScript 키·네이티브 앱 키·Admin 키)를 넣었을 수 있어요. 「앱 키」 화면의 「REST API 키」를 다시 복사해 넣어 주세요. 3단계 「카카오 로그인 활성화 ON」도 확인해 주세요." },
  { q: "연결은 됐는데 시험 메시지가 안 와요.", a: "4단계 「카카오톡 메시지 전송」 동의항목이 꺼져 있으면 보낼 수 없어요. 켠 뒤 「💬 카카오 연결하기」를 한 번 더 눌러 다시 동의해 주세요. 메시지는 카톡 「나와의 채팅」에 와요." },
  { q: "「결과 보기」를 누르면 엉뚱한 화면이 열려요.", a: "5단계 웹 도메인에 이 프로그램 주소가 없어서 그래요. 주소를 추가하면 바로 고쳐져요." },
  { q: "카카오 자동화 프로그램에서 이미 연결했어요.", a: "같은 카카오 앱이면 그대로 쓸 수 있어요(연결 정보는 회원님 계정 하나로 함께 써요). 「받는 방법」에서 「✅ 연결됨」이 보이면 따로 할 일이 없어요. 다른 앱으로 새로 연결하면 두 프로그램 모두 새 앱을 써요." },
  { q: "돈이 드나요?", a: "아니요. 카카오톡 「나에게 보내기」는 무료이고 카카오 심사도 필요 없어요. 앱은 회원님 본인 것만 쓰고, 다른 사람의 앱·계정을 빌려 쓰지 않아요." },
];

export default function KakaoGuide() {
  return (
    <section className="card kg" id="kakao" aria-labelledby="kg-title">
      <div className="kg-head">
        <div>
          <h2 className="card-title" id="kg-title">💬 카카오톡으로 알림 받기 — 처음이어도 10분이면 돼요</h2>
          <p className="card-caption">카카오가 「내 카톡으로 보내도 된다」고 허락하려면 <b>회원님 본인의 카카오 앱</b>이 하나 필요해요. 아래 6단계를 순서대로만 따라 하세요. (카카오 화면의 메뉴 이름은 조금 다를 수 있어요 — 비슷한 이름을 찾으면 돼요.)</p>
        </div>
        <span className="kg-badge">⏱ 약 10분 · 💸 무료</span>
      </div>

      <ol className="kg-stages">
        {STAGES.map((s, i) => (
          <li key={s.title}>
            <div className="kg-stage-head">
              <span className="kg-num">{i + 1}</span>
              <strong>{s.title}</strong>
              <span className="kg-time">⏱ {s.time}</span>
            </div>
            <ul>{s.steps.map((step, k) => <li key={k}>{step}</li>)}</ul>
            {s.link && (s.link.href.startsWith("http")
              ? <a className="secondary kg-link" href={s.link.href} target="_blank" rel="noopener noreferrer">{s.link.label}</a>
              : <a className="secondary kg-link" href={s.link.href}>{s.link.label}</a>)}
          </li>
        ))}
      </ol>

      <div className="guide-two">
        <section className="guide-tip">
          <h3>💡 TIP</h3>
          <ul>
            <li>키 2개는 메모장에 잠깐 붙여 두면 헷갈리지 않아요. 다 끝나면 메모는 지워 주세요.</li>
            <li>카톡으로는 <b>요약 + 「결과 보기」 버튼</b>이 와요. 엑셀 파일까지 받으려면 텔레그램이나 이메일도 함께 켜 두세요.</li>
          </ul>
        </section>
        <section className="guide-warn">
          <h3>⚠️ 꼭 알아 두세요</h3>
          <ul>
            <li>돌아올 주소·도메인은 <b>한 글자도 다르면 안 돼요.</b> 꼭 「📋 복사」 버튼으로 복사해 붙여 넣으세요.</li>
            <li>카카오 연결은 <b>회원님 본인 앱·본인 계정</b>만 써요. 다른 사람의 키를 넣지 마세요.</li>
          </ul>
        </section>
      </div>

      <h3 className="kg-sub">🛠 막혔을 때</h3>
      <div className="guide-faq">
        {TROUBLE.map((t) => (
          <details key={t.q}>
            <summary>{t.q}</summary>
            <p>{t.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
