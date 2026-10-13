function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <li className="gd-step">
      <span className="gd-num">{n}</span>
      <div><strong>{title}</strong><p>{children}</p></div>
    </li>
  );
}
function K({ children }: { children: React.ReactNode }) {
  return <kbd className="gd-kbd">{children}</kbd>;
}

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function GuidePage() {
  return (
    <>
      <div className="page-heading">
        <p className="eyebrow">사용 설명서</p>
        <h1>연동 & 사용 매뉴얼</h1>
        <p>내 컴퓨터의 음악 파일을 재생하고 시각화·이퀄라이저로 즐기는 방법입니다. 별도 계정 연동이나 API 키는 필요하지 않습니다.</p>
      </div>
      <div className="gd">
        <nav className="gd-toc card" aria-label="목차">
          <strong>바로가기</strong>
          <a href="#quick">① 1분 시작하기</a>
          <a href="#screen">② 화면 설명</a>
          <a href="#list">③ 재생목록 관리</a>
          <a href="#eq">④ 이퀄라이저·시각화</a>
          <a href="#save">⑤ 저장과 보관</a>
          <a href="#keys">⑥ 단축키</a>
          <a href="#faq">⑦ 막힐 때(FAQ)</a>
        </nav>

        <section id="quick" className="card">
          <h2>① 1분 시작하기</h2>
          <ol className="gd-steps">
            <Step n={1} title="음악 파일을 추가합니다">
              화면 어디든 음악 파일(mp3·m4a·wav·flac·ogg 등)을 <b>끌어다 놓거나</b>, [파일 추가]·[폴더 추가] 버튼을 누릅니다. 여러 곡을 한꺼번에 추가할 수 있습니다.
            </Step>
            <Step n={2} title="오른쪽 목록에서 곡을 누릅니다">
              곡을 누르면 바로 재생됩니다. 가운데 커다란 화면에 음악에 맞춰 움직이는 시각화가 나타납니다.
            </Step>
            <Step n={3} title="재생을 조절합니다">
              ▶/⏸ 재생·일시정지, ⏮ ⏭ 이전·다음 곡, 진행 막대로 원하는 위치로 이동, 볼륨과 재생 속도(0.5~2배)를 바꿀 수 있습니다.
            </Step>
            <Step n={4} title="마음에 들게 소리를 다듬습니다">
              [이퀄라이저]를 열어 저음·고음을 조절하거나 록·팝·재즈 등 프리셋을 눌러 보세요.
            </Step>
          </ol>
          <p className="gd-tip">💡 <b>파일은 서버로 올라가지 않습니다.</b> 내 컴퓨터(브라우저)에만 저장되므로 다른 기기에서는 같은 파일을 다시 추가해야 합니다.</p>
        </section>

        <section id="screen" className="card">
          <h2>② 화면 설명</h2>
          <div className="gd-table">
            <div><b>시각화 화면</b><span>음악의 높낮이를 그림으로 보여 줍니다. [시각화 ↔ 커버]로 앨범 커버 보기로 바꾸고, 모드(막대·원형·점·파형·곡선)를 고를 수 있습니다.</span></div>
            <div><b>곡 정보</b><span>화면 아래쪽에 제목·아티스트·앨범과 커버 이미지가 표시됩니다. 파일에 태그(ID3)가 있으면 그 정보를, 없으면 파일 이름을 사용합니다.</span></div>
            <div><b>🔀 셔플</b><span>곡을 무작위로 재생합니다. 한 바퀴 동안 같은 곡이 반복되지 않습니다.</span></div>
            <div><b>🔁 반복</b><span>누를 때마다 “반복 안 함 → 전체 반복 → 한 곡 반복”으로 바뀝니다.</span></div>
            <div><b>재생 속도</b><span>0.5배~2배. 강의·어학 학습 때 유용합니다.</span></div>
          </div>
        </section>

        <section id="list" className="card">
          <h2>③ 재생목록 관리</h2>
          <div className="gd-cards">
            <article><h3>검색</h3><p>목록 위 검색칸에 제목·아티스트·앨범 일부를 입력하면 바로 걸러집니다. 키보드 <K>/</K>로 검색칸에 바로 이동합니다.</p></article>
            <article><h3>정렬</h3><p>[정렬] 버튼을 누를 때마다 “추가한 순서 → 제목↑↓ → 아티스트↑↓ → 길이↑↓” 순으로 바뀝니다. 이전·다음 곡도 지금 보이는 순서를 따릅니다.</p></article>
            <article><h3>여러 곡 삭제</h3><p>곡 왼쪽 체크박스를 선택하거나 [전체 선택]을 누른 뒤 [삭제]를 누릅니다. 원본 파일은 지워지지 않고 이 브라우저에 저장된 사본만 삭제됩니다.</p></article>
            <article><h3>중복 방지</h3><p>이름·아티스트·크기가 같은 곡은 자동으로 건너뜁니다.</p></article>
          </div>
        </section>

        <section id="eq" className="card">
          <h2>④ 이퀄라이저·시각화</h2>
          <ul className="gd-list">
            <li><b>8밴드 이퀄라이저</b> — 60Hz(깊은 저음)부터 12kHz(맑은 고음)까지 막대를 위아래로 움직여 −15~+15dB를 조절합니다.</li>
            <li><b>프리앰프</b> — 전체 음량 여유를 조절합니다. 소리가 찢어지면 프리앰프를 −3~−6dB로 낮춰 보세요.</li>
            <li><b>프리셋</b> — 록·팝·재즈·클래식·저음 강조·보컬 강조. 마음에 드는 설정은 이름을 적어 [저장]하면 “내 프리셋”에 남습니다.</li>
            <li><b>초기화</b> — 모든 막대를 0으로 되돌립니다.</li>
          </ul>
        </section>

        <section id="save" className="card">
          <h2>⑤ 저장과 보관</h2>
          <div className="gd-table">
            <div><b>자동 저장</b><span>재생목록, 마지막으로 듣던 곡, 볼륨, 이퀄라이저, 시각화 모드가 자동으로 저장됩니다. 다시 접속하면 그대로 복원됩니다(곡은 일시정지 상태).</span></div>
            <div><b>저장 위치</b><span>이 컴퓨터의 브라우저 안(IndexedDB)입니다. 서버·클라우드에는 올라가지 않습니다.</span></div>
            <div><b>계정별 분리</b><span>같은 브라우저를 여러 회원이 써도 각자의 목록이 섞이지 않습니다.</span></div>
            <div><b>저장 공간 부족</b><span>목록 아래 “브라우저 저장 사용량”을 확인하세요. 공간이 부족하면 해당 곡은 이번 접속 동안만 유지된다는 표시(!)가 나타납니다. 쓰지 않는 곡을 삭제하면 공간이 확보됩니다.</span></div>
            <div><b>브라우저 데이터 삭제 시</b><span>브라우저의 사이트 데이터를 지우면 저장된 곡도 함께 사라집니다. 원본 파일은 그대로이니 다시 추가하면 됩니다.</span></div>
          </div>
        </section>

        <section id="keys" className="card">
          <h2>⑥ 단축키</h2>
          <div className="gd-table">
            <div><b><K>Space</K></b><span>재생 / 일시정지</span></div>
            <div><b><K>←</K> <K>→</K></b><span>5초 뒤로 / 앞으로</span></div>
            <div><b><K>↑</K> <K>↓</K></b><span>볼륨 올리기 / 내리기</span></div>
            <div><b><K>N</K> / <K>P</K></b><span>다음 곡 / 이전 곡 (3초 넘게 들었으면 처음부터)</span></div>
            <div><b><K>S</K></b><span>셔플 켜기·끄기</span></div>
            <div><b><K>R</K></b><span>반복 모드 바꾸기</span></div>
            <div><b><K>M</K></b><span>음소거</span></div>
            <div><b><K>/</K></b><span>검색칸으로 이동</span></div>
          </div>
        </section>

        <section id="faq" className="card">
          <h2>⑦ 막힐 때 (자주 묻는 질문)</h2>
          <div className="gd-faq">
            <details><summary>소리가 안 나요.</summary><p>① 볼륨과 음소거(M) 상태를 확인하세요. ② 브라우저 탭이 음소거되지 않았는지 보세요. ③ 이퀄라이저를 [초기화]해 보세요. ④ 처음 재생은 반드시 버튼이나 곡을 직접 눌러야 시작됩니다.</p></details>
            <details><summary>“재생할 수 없는 파일”이라고 나와요.</summary><p>브라우저가 지원하지 않는 형식이거나 파일이 손상된 경우입니다. mp3·m4a(AAC)·wav·ogg·flac은 대부분 재생됩니다. 일부 형식(예: wma)은 브라우저가 재생하지 못할 수 있습니다.</p></details>
            <details><summary>다음에 접속했더니 곡이 없어요.</summary><p>다른 브라우저·다른 기기·시크릿 창에서는 저장된 목록이 보이지 않습니다. 같은 브라우저, 같은 계정으로 접속해 주세요. 브라우저 사이트 데이터를 삭제했다면 파일을 다시 추가해야 합니다.</p></details>
            <details><summary>곡 제목이 파일 이름으로 보여요.</summary><p>파일에 태그(ID3) 정보가 없는 경우입니다. 파일 이름을 “아티스트 - 제목”으로 만들어 두면 자동으로 분리해 표시합니다.</p></details>
            <details><summary>길이가 --:-- 로 보여요.</summary><p>일부 형식은 길이를 미리 읽지 못합니다. 재생을 시작하면 길이가 표시됩니다.</p></details>
            <details><summary>다른 기기에서도 듣고 싶어요.</summary><p>음악 파일은 서버에 저장하지 않는 것이 이 프로그램의 원칙입니다. 다른 기기에서는 같은 파일을 다시 추가해 주세요.</p></details>
          </div>
        </section>
      </div>
    </>
  );
}
