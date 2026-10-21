"use client";
import Link from "next/link";

// 연동 & 사용 매뉴얼 — docs/MANUAL_AND_INTEGRATION_GUIDELINES.md(메타데이터 바 · 개요 카드 · Step 1~4 카드 · 상세 단계 · 팁 · 함정 방지 · 바로가기)
// 스타일 8(로컬 파일·브라우저 처리형): 외부 API 키가 없는 프로그램이라 「파일 준비 → 시간 맞추기 → 디자인 → 내보내기」를 그림처럼 안내한다.

const STEPS = [
  { n: 1, emoji: "🎵", title: "음악·가사 넣기", time: "1분", desc: "음악 파일, 커버(선택), 가사를 넣습니다.", href: "/source" },
  { n: 2, emoji: "⏱️", title: "가사 싱크", time: "곡 길이만큼", desc: "노래를 들으며 스페이스바로 줄 시작을 찍습니다.", href: "/sync" },
  { n: 3, emoji: "🎨", title: "디자인", time: "2분", desc: "가로·세로 프리셋을 고르고 색·글자를 다듬습니다.", href: "/design" },
  { n: 4, emoji: "🎬", title: "MP4 내보내기", time: "곡 길이의 약 1~2배", desc: "브라우저에서 1080p 영상을 만들어 내려받습니다.", href: "/export" },
];

export function GuideView() {
  return (
    <div className="stack guide">
      <div className="guide-meta">
        <span>📖 사용 매뉴얼</span><span>⏱️ 첫 영상까지 약 10~15분</span><span>🔑 API 키 필요 없음</span><span>🖥️ 크롬·엣지(PC) 권장</span>
        <Link className="button" href="/source">바로 시작하기 →</Link>
      </div>

      <section className="hero">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>노래 한 곡이 가사 영상이 되기까지</h1>
          <p>AI 가사영상 자동화는 음악 파일과 가사로 「지금 부르는 줄」이 강조되며 흐르는 영상을 만듭니다. 모든 처리는 이 컴퓨터의 브라우저 안에서 이뤄지고, 음악·커버·완성 영상은 서버로 올라가지 않습니다.</p>
          <div className="hero-meta"><span>가로 16:9 유튜브</span><span>세로 9:16 쇼츠·릴스</span><span>현재 줄 강조 7종</span><span>프리셋 10종</span></div>
        </div>
        <div className="hero-icon" aria-hidden>🎤</div>
      </section>

      <section className="card">
        <h2>핵심 4단계</h2>
        <div className="diagram">
          {STEPS.map((s) => (
            <Link key={s.n} className="node" href={s.href}>
              <div className="emoji">{s.emoji}</div><strong>Step {s.n}. {s.title}</strong>
              <small style={{ display: "block" }}>{s.desc}</small><span className="badge brand" style={{ marginTop: 6 }}>⏱️ {s.time}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2>Step 1. 음악·가사 넣기</h2>
        <ol className="guide-list">
          <li><strong>음악 파일</strong>을 끌어다 놓습니다(mp3·wav·m4a·ogg·flac, 12분 이하 권장). 파일 이름이 곡 제목 칸에 자동으로 들어갑니다.</li>
          <li><strong>앨범 커버</strong>는 선택입니다. 없으면 강조색과 제목 첫 글자로 앨범 아트를 만들어 줍니다.</li>
          <li><strong>가사</strong>는 세 가지 방법 중 하나로 넣습니다.
            <div className="guide-table">
              <div><strong>.srt 자막 파일</strong><small>시간이 들어 있어 2단계를 건너뛸 수 있습니다. 번호 빠짐·공백 차이 같은 작은 형식 오류는 알아서 읽습니다.</small></div>
              <div><strong>.lrc 가사 파일</strong><small>[00:12.00]처럼 시간이 붙은 가사 파일입니다.</small></div>
              <div><strong>가사 붙여넣기</strong><small>한 줄에 한 소절씩 붙여넣고 「가사 적용」을 누릅니다. 시간은 2단계에서 맞춥니다.</small></div>
            </div>
          </li>
        </ol>
        <pre className="code-sample">{`1
00:00:12,500 --> 00:00:15,800
어두워진 하늘 밑 바람이 불어와

2
00:00:16,000 --> 00:00:19,200
회색빛 도시 위 떨어지는 그림자`}</pre>
        <small className="muted">▲ .srt 예시 — 번호, 「시작 --&gt; 끝」 시간, 가사가 빈 줄로 나뉩니다. 메모장으로도 만들 수 있습니다(UTF-8로 저장).</small>
      </section>

      <section className="card stack">
        <h2>Step 2. 가사 싱크 (탭으로 시간 맞추기)</h2>
        <ol className="guide-list">
          <li>「▶ 처음부터 맞추기」를 누르면 노래가 처음부터 재생됩니다.</li>
          <li>화면의 큰 버튼에 <strong>다음에 시작할 줄</strong>이 보입니다. 그 줄을 부르기 시작할 때 <kbd>스페이스바</kbd>를 누르세요(휴대폰은 큰 버튼을 누름).</li>
          <li>잘못 눌렀으면 <kbd>백스페이스</kbd>(「↩ 한 줄 되돌리기」) — 그 줄 시간이 지워지고 노래가 2초 뒤로 돌아갑니다.</li>
          <li>끝난 뒤 목록에서 줄마다 <strong>−/+ (0.1초)</strong>로 다듬거나 시간을 직접 적어 고칩니다. 「▶」는 그 줄 0.5초 앞부터 들려줍니다.</li>
          <li>맞춘 시간은 「⬇ .srt 받기」로 자막 파일로 내려받아 다른 영상 편집에도 쓸 수 있습니다.</li>
        </ol>
      </section>

      <section className="card stack">
        <h2>Step 3. 디자인</h2>
        <ol className="guide-list">
          <li>위쪽에서 <strong>가로 16:9</strong>(유튜브) 또는 <strong>세로 9:16</strong>(쇼츠·릴스)을 고르면 그 화면에 맞는 프리셋만 보입니다.</li>
          <li>프리셋을 누르면 색·서체·강조 방식·스펙트럼이 한 번에 바뀝니다. 가사 크기와 프레임레이트는 그대로 유지됩니다.</li>
          <li>「현재 줄 강조」 7종: 색 강조 · 채운 박스 · 테두리 박스 · 형광펜 · 밑줄 긋기 · 앞 막대 · 노래방 채움.</li>
          <li>미리보기는 실제 영상과 같은 방법으로 그려집니다. 재생해 보며 고르세요.</li>
        </ol>
      </section>

      <section className="card stack">
        <h2>Step 4. MP4 내보내기</h2>
        <ol className="guide-list">
          <li>「만들기 전 확인」 네 줄이 모두 ✅이면 「🎬 MP4 만들기」를 누릅니다.</li>
          <li>만드는 시간은 곡 길이의 약 1~2배입니다(그래픽 카드가 좋을수록 빠름). 만드는 동안 탭을 닫지 마세요.</li>
          <li>끝나면 화면에서 바로 재생해 보고 「⬇ 내려받기」로 저장합니다. 영상은 서버에 남지 않습니다.</li>
          <li>나중에 다시 고치려면 위쪽 「💾 저장」으로 가사 시간표·디자인을 보관함에 남겨 두세요(30일 보관).</li>
        </ol>
      </section>

      <div className="tip-banner"><strong>💡 실전 팁</strong>
        <ul>
          <li>손이 박자보다 조금 늦게 눌리는 것이 보통이라 「손 반응 보정」 기본값이 −0.1초입니다. 계속 늦게 찍히면 −0.2초로 바꿔 보세요.</li>
          <li>후렴처럼 같은 가사가 반복되면 붙여넣을 때 반복 횟수만큼 그대로 적어 두세요. 줄마다 따로 시간을 맞춥니다.</li>
          <li>쇼츠는 1분 안쪽 구간이 좋습니다. 음악 파일을 원하는 구간만 잘라서 넣으면 됩니다.</li>
        </ul>
      </div>
      <div className="warn-banner"><strong>⚠️ 꼭 확인하세요</strong>
        <ul>
          <li><strong>저작권</strong>: 본인이 만든 곡(AI로 만든 곡 포함)이나 사용 허락을 받은 곡만 쓰세요. 남의 곡을 올리면 유튜브에서 수익이 막히거나 영상이 내려갈 수 있습니다.</li>
          <li><strong>브라우저</strong>: 휴대폰·사파리·오래된 브라우저는 영상 만들기를 지원하지 않을 수 있습니다. PC의 최신 크롬·엣지를 쓰세요.</li>
          <li><strong>한글 깨짐</strong>: .srt·.txt 파일의 한글이 깨지면 메모장에서 「다른 이름으로 저장 → 인코딩 UTF-8」로 다시 저장하세요.</li>
          <li><strong>음악 파일은 저장되지 않습니다</strong>: 보관함에서 작업을 열면 1단계에서 같은 음악 파일을 다시 넣어야 합니다.</li>
        </ul>
      </div>
      <div className="actions">
        <Link className="button primary" href="/source">🎵 지금 첫 곡 만들기</Link>
        <a className="button" href="https://www.buylife.xyz/programs" target="_blank" rel="noreferrer">다른 자동화 프로그램 보기 ↗</a>
      </div>
    </div>
  );
}
