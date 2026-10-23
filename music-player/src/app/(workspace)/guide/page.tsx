import {
  AudioLines, BookOpen, CheckCircle2, Disc3, FolderPlus, HelpCircle, Key, Layers,
  ListMusic, Music, Radio, ShieldCheck, SlidersHorizontal, Sparkles, Volume2, Zap
} from "lucide-react";

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
        <p className="eyebrow">Interactive Studio Manual</p>
        <h1>🎧 연동 & 사용 매뉴얼</h1>
        <p>내 컴퓨터의 음악 파일을 화려한 비주얼라이저와 8밴드 그래픽 이퀄라이저로 즐기는 시각 가이드입니다. 서버 업로드 없는 100% 안전한 로컬 오디오 스튜디오를 경험해 보세요.</p>
      </div>

      <div className="gd">
        {/* 바로가기 목차 */}
        <nav className="gd-toc card" aria-label="목차">
          <strong>⚡ 바로가기</strong>
          <a href="#quick">① 1분 퀵스타트</a>
          <a href="#architecture">② 오디오 아키텍처</a>
          <a href="#screen">③ 콘솔 구성 가이드</a>
          <a href="#eq">④ 8밴드 EQ & 시각화</a>
          <a href="#list">⑤ 재생목록 & 태그 관리</a>
          <a href="#save">⑥ 프라이버시 & 로컬 보관</a>
          <a href="#keys">⑦ 키보드 단축키</a>
          <a href="#faq">⑧ 문제 해결 (FAQ)</a>
        </nav>

        {/* 1. 1분 퀵스타트 */}
        <section id="quick" className="card">
          <h2><Zap size={20} color="#00f2fe" /> ① 1분 시작하기 (Quick Start)</h2>
          <p className="gd-lead">별도의 계정 연동이나 복잡한 설정 없이, 즉시 브라우저에서 음악을 재생하고 사운드를 커스텀할 수 있습니다.</p>

          {/* 파이프라인 다이어그램 */}
          <div className="visual-diagram-card">
            <div className="visual-diagram-title">
              <Sparkles size={16} /> 4단계 음악 감상 워크플로우
            </div>
            <div className="pipeline-grid">
              <div className="pipeline-step">
                <span className="pipeline-badge">STEP 1</span>
                <span className="pipeline-icon">📂</span>
                <span className="pipeline-name">음원 추가</span>
                <span className="pipeline-desc">파일·폴더 끌어다 놓기 또는 파일 추가 버튼 클릭</span>
              </div>
              <div className="pipeline-step">
                <span className="pipeline-badge">STEP 2</span>
                <span className="pipeline-icon">🎵</span>
                <span className="pipeline-name">트랙 선택</span>
                <span className="pipeline-desc">재생목록에서 곡 클릭 시 즉시 실시간 재생 시작</span>
              </div>
              <div className="pipeline-step">
                <span className="pipeline-badge">STEP 3</span>
                <span className="pipeline-icon">🎚️</span>
                <span className="pipeline-name">사운드 튜닝</span>
                <span className="pipeline-desc">8밴드 이퀄라이저 & 프리셋으로 취향에 맞는 음색 조절</span>
              </div>
              <div className="pipeline-step">
                <span className="pipeline-badge">STEP 4</span>
                <span className="pipeline-icon">✨</span>
                <span className="pipeline-name">시각화 몰입</span>
                <span className="pipeline-desc">5개 모드 네온 캔버스 오디오 비주얼라이저 감상</span>
              </div>
            </div>
          </div>

          <ol className="gd-steps">
            <Step n={1} title="음악 파일을 추가합니다">
              화면 어디든 음악 파일(mp3·m4a·wav·flac·ogg·opus 등)을 <b>마우스로 끌어다 놓거나</b>(Drag & Drop), 좌측 상단의 <b>[파일 추가]</b> 또는 <b>[폴더 추가]</b> 버튼을 누릅니다.
            </Step>
            <Step n={2} title="오른쪽 재생목록에서 원하는 곡을 선택합니다">
              곡을 클릭하거나 더블 클릭하면 즉시 재생됩니다. 중앙의 대형 캔버스에 음악의 주파수와 리듬에 반응하는 실시간 네온 그래픽이 펼쳐집니다.
            </Step>
            <Step n={3} title="재생 및 오디오 밸런스를 조절합니다">
              ▶/⏸ 재생·일시정지, 셔플(🔀), 전체/한곡 반복(🔁), 슬라이더로 원하는 재생 위치 이동, 볼륨 및 재생 속도(0.5x~2.0x)를 자유롭게 제어할 수 있습니다.
            </Step>
            <Step n={4} title="이퀄라이저로 하이파이 사운드를 완성합니다">
              [이퀄라이저] 버튼을 눌러 60Hz 깊은 서브 베이스부터 12kHz 맑은 고음까지 미세 튜닝하거나, 록·팝·재즈 등 추천 프리셋을 적용해 보세요.
            </Step>
          </ol>

          <p className="gd-tip">
            💡 <b>지원 오디오 포맷 안내:</b>
            <span className="audio-chip-list">
              <span className="audio-chip">🎵 MP3</span>
              <span className="audio-chip">🎶 FLAC (무손실)</span>
              <span className="audio-chip">🎼 WAV (고음질)</span>
              <span className="audio-chip">🎧 M4A / AAC</span>
              <span className="audio-chip">📻 OGG / OPUS</span>
            </span>
          </p>
        </section>

        {/* 2. 오디오 아키텍처 & 로컬 엔진 */}
        <section id="architecture" className="card">
          <h2><Radio size={20} color="#38bdf8" /> ② 오디오 엔진 구조 & 하이파이 프로세싱</h2>
          <p className="gd-lead">브라우저 내장 Web Audio API를 활용한 고성능 32비트 부동소수점 오디오 그래프 엔진이 탑재되어 있습니다.</p>
          
          <div className="visual-diagram-card">
            <div className="visual-diagram-title">
              <AudioLines size={16} /> Web Audio API 신호 흐름 (Signal Flow)
            </div>
            <div style={{ padding: "10px 0", textAlign: "center", color: "#38bdf8", fontSize: "12.5px", fontWeight: 700 }}>
              <code>Audio File (IndexedDB)</code> ➔ <code>MediaElementSource</code> ➔ <code>Preamp GainNode</code> ➔ <code>8x BiquadFilter (EQ)</code> ➔ <code>AnalyserNode (1024 FFT)</code> ➔ <code>Speakers (Destination)</code>
            </div>
          </div>

          <div className="gd-cards">
            <article>
              <h3>🎛️ 무손실 8밴드 피킹 필터</h3>
              <p>초저역대(60Hz, 170Hz)부터 중음역대(310Hz, 600Hz, 1kHz, 3kHz), 고음역대(6kHz, 12kHz)까지 왜곡 없는 Q-팩터 바이쿼드 필터를 적용합니다.</p>
            </article>
            <article>
              <h3>⚡ 프리앰프 헤드룸 보정</h3>
              <p>대역 게인을 높였을 때 발생할 수 있는 디지털 클리핑(찢어지는 소리)을 방지하기 위해 −12dB~+12dB 범위의 프리앰프 게인 제어를 제공합니다.</p>
            </article>
            <article>
              <h3>🎨 60FPS 실시간 FFT 분석기</h3>
              <p>1024 밴드의 고해상도 고속 푸리에 변환(FFT) 데이터를 초당 60프레임으로 추출하여 캔버스에 화려한 주파수 파형을 렌더링합니다.</p>
            </article>
            <article>
              <h3>🏷️ 브라우저 ID3v2 태그 파서</h3>
              <p>곡의 바이너리 헤더를 읽어 제목, 아티스트, 앨범명, 그리고 앨범 커버 아트워크 이미지를 자동으로 추출해 표시합니다.</p>
            </article>
          </div>
        </section>

        {/* 3. 화면 설명 */}
        <section id="screen" className="card">
          <h2><Layers size={20} color="#a855f7" /> ③ 콘솔 구성 가이드</h2>
          <div className="gd-table">
            <div><b>네온 비주얼 스테이지</b><span>음악의 비트와 주파수에 반응하는 다이내믹 캔버스입니다. [시각화 ↔ 커버] 전환으로 앨범 커버 아트로 교체할 수 있습니다.</span></div>
            <div><b>트랙 인포 바</b><span>현재 재생 중인 곡의 앨범 커버 썸네일, 곡 제목, 아티스트, 앨범명 및 로컬 저장 상태를 실시간으로 보여줍니다.</span></div>
            <div><b>네온 타임라인 시크바</b><span>현재 재생 시간 / 전체 재생 시간을 디지털로 표시하며, 마우스 클릭이나 드래그로 원하는 지점으로 부드럽게 이동합니다.</span></div>
            <div><b>메인 컨트롤 데크</b><span>셔플(🔀), 반복 모드(🔁), 이전 곡, 메인 플레이 버튼(▶/⏸), 다음 곡, 볼륨 조절 및 재생 배속(0.5x~2.0x)을 조작합니다.</span></div>
            <div><b>툴바 및 단축키 안내</b><span>파일/폴더 추가, 시각화 모드 선택(막대·원형·점·파형·곡선), 이퀄라이저 토글, 키보드 단축키 창을 열 수 있습니다.</span></div>
            <div><b>스마트 재생목록 (우측)</b><span>내 컴퓨터에 추가된 모든 트랙의 목록입니다. 검색, 다중 선택, 정렬(추가순·제목순·가수순·길이순), 삭제를 지원합니다.</span></div>
          </div>
        </section>

        {/* 4. 이퀄라이저 & 시각화 */}
        <section id="eq" className="card">
          <h2><SlidersHorizontal size={20} color="#ec4899" /> ④ 8밴드 이퀄라이저 & 시각화 모드</h2>
          
          <div className="visual-diagram-card">
            <div className="visual-diagram-title">
              <SlidersHorizontal size={16} /> 8개 주파수 대역의 사운드 특성
            </div>
            <div className="pipeline-grid">
              <div className="pipeline-step">
                <span className="pipeline-badge" style={{ background: "#f43f5e", color: "#fff" }}>60Hz ~ 170Hz</span>
                <span className="pipeline-icon">🥁</span>
                <span className="pipeline-name">서브 베이스 & 킥</span>
                <span className="pipeline-desc">가슴을 울리는 묵직한 타격감과 베이스 기타의 중후함</span>
              </div>
              <div className="pipeline-step">
                <span className="pipeline-badge" style={{ background: "#f59e0b", color: "#fff" }}>310Hz ~ 600Hz</span>
                <span className="pipeline-icon">🎸</span>
                <span className="pipeline-name">로우 미드 (바디감)</span>
                <span className="pipeline-desc">악기의 따뜻한 질감과 리듬 기타, 피아노의 풍성함</span>
              </div>
              <div className="pipeline-step">
                <span className="pipeline-badge" style={{ background: "#10b981", color: "#fff" }}>1kHz ~ 3kHz</span>
                <span className="pipeline-icon">🎤</span>
                <span className="pipeline-name">하이 미드 (보컬)</span>
                <span className="pipeline-desc">가수의 목소리가 또렷하게 들리는 핵심 전달 대역</span>
              </div>
              <div className="pipeline-step">
                <span className="pipeline-badge" style={{ background: "#06b6d4", color: "#fff" }}>6kHz ~ 12kHz</span>
                <span className="pipeline-icon">✨</span>
                <span className="pipeline-name">트레블 & 에어감</span>
                <span className="pipeline-desc">심벌즈, 어쿠스틱 현의 찰랑거림과 맑은 개방감</span>
              </div>
            </div>
          </div>

          <ul className="gd-list">
            <li><b>8밴드 페이더</b>: 각 슬라이더를 마우스로 조절하여 −15dB에서 +15dB까지 미세 조절할 수 있습니다.</li>
            <li><b>원클릭 장르별 프리셋</b>: 록(Rock), 팝(Pop), 재즈(Jazz), 클래식(Classic), 베이스 부스트(Bass Boost), 보컬 강화(Vocal Boost)를 단 한 번의 클릭으로 적용합니다.</li>
            <li><b>내 프리셋 저장</b>: 내가 조절한 최적의 EQ 세팅에 이름을 붙여 [저장]하면 “내 프리셋”에 영구 보관됩니다.</li>
            <li><b>5가지 비주얼라이저 모드</b>:
              <ul>
                <li><b>막대 (Bars)</b>: 64개 네온 컬러 바가 리듬에 맞춰 솟구치는 클래식 스펙트럼 뷰.</li>
                <li><b>원형 (Circle)</b>: 중심에서 360도 방향으로 뻗어나가는 사이버 방사형 뷰.</li>
                <li><b>점 매트릭스 (Dots)</b>: LED 디지털 전광판 감성의 32x14 도트 매트릭스 뷰.</li>
                <li><b>파형 (Wave)</b>: 오실로스코프처럼 실제 소리의 진폭을 보여주는 생동감 있는 파형.</li>
                <li><b>곡선 (Line)</b>: 부드러운 그라디언트 스펙트럼 곡선과 하단 채우기 뷰.</li>
              </ul>
            </li>
          </ul>
        </section>

        {/* 5. 재생목록 & 태그 관리 */}
        <section id="list" className="card">
          <h2><ListMusic size={20} color="#10b981" /> ⑤ 재생목록 & 검색 / 정렬</h2>
          <div className="gd-cards">
            <article>
              <h3>🔍 실시간 즉시 검색 ( / )</h3>
              <p>키보드의 <K>/</K> 키를 누르면 바로 검색창으로 포커스됩니다. 제목, 가수, 앨범명의 일부분만 입력해도 즉각 필터링됩니다.</p>
            </article>
            <article>
              <h3>🔄 스마트 다중 정렬</h3>
              <p>[정렬] 버튼을 누를 때마다 <b>추가한 순서 ➔ 제목 오름/내림차순 ➔ 아티스트순 ➔ 곡 재생시간순</b>으로 자유롭게 정렬됩니다.</p>
            </article>
            <article>
              <h3>🗑️ 선택 삭제 & 일괄 비우기</h3>
              <p>체크박스로 원하는 곡만 골라 삭제하거나 [전체 삭제]로 목록을 초기화할 수 있습니다. 원본 파일은 안전하며 브라우저 저장 사본만 정리됩니다.</p>
            </article>
            <article>
              <h3>🛡️ 중복 음원 자동 필터링</h3>
              <p>폴더째 추가할 때 동일한 파일(파일명·크기 일치)이 이미 목록에 있다면 자동으로 중복 추가를 방지합니다.</p>
            </article>
          </div>
        </section>

        {/* 6. 저장과 보안 */}
        <section id="save" className="card">
          <h2><ShieldCheck size={20} color="#00f2fe" /> ⑥ 데이터 보안 & 로컬 보관 원칙</h2>
          <div className="notice" style={{ marginBottom: "16px" }}>
            <span style={{ fontWeight: 800, color: "#38bdf8" }}>🔒 100% 로컬 프라이버시 보장:</span> 본 프로그램은 음원 파일을 외부 서버로 절대 전송하지 않습니다. 모든 오디오 데이터와 세팅은 접속하신 브라우저의 전용 IndexedDB 스토리지에 안전하게 보관됩니다.
          </div>
          <div className="gd-table">
            <div><b>자동 복원 시스템</b><span>마지막으로 재생하던 곡, 볼륨, 셔플/반복 모드, 이퀄라이저 설정값이 브라우저에 안전하게 기억되어 다음 접속 시 즉시 복원됩니다.</span></div>
            <div><b>회원별 격리 스토리지</b><span>동일한 PC나 브라우저를 다른 회원이 사용하더라도 로그인 계정(<code>userId</code>)별로 독립된 스토리지 슬롯(<code>music-player-&#123;userId&#125;</code>)을 사용하므로 재생목록이 섞이지 않습니다.</span></div>
            <div><b>저장 공간 한도 관리</b><span>재생목록 하단에서 브라우저 스토리지 사용량을 실시간으로 확인할 수 있습니다. 용량이 큰 파일도 안전하게 캐싱됩니다.</span></div>
            <div><b>브라우저 데이터 초기화 시</b><span>브라우저의 '방문 기록 및 사이트 데이터 삭제'를 실행하면 저장된 음원 사본이 지워질 수 있으므로, 원본 음악 파일은 개인 저장장치에 잘 보관해 주세요.</span></div>
          </div>
        </section>

        {/* 7. 키보드 단축키 */}
        <section id="keys" className="card">
          <h2><Key size={20} color="#f59e0b" /> ⑦ 키보드 단축키 치트시트</h2>
          <p className="gd-lead">마우스를 쓰지 않고 키보드만으로 모든 재생 기능을 프로페셔널하게 제어할 수 있습니다.</p>
          <div className="gd-table">
            <div><b><K>Space</K></b><span>음악 재생 / 일시정지 (Play / Pause)</span></div>
            <div><b><K>←</K> <K>→</K></b><span>현재 재생 위치 5초 뒤로 / 앞으로 이동</span></div>
            <div><b><K>↑</K> <K>↓</K></b><span>볼륨 5% 올리기 / 내리기</span></div>
            <div><b><K>N</K> / <K>P</K></b><span>다음 곡(Next) / 이전 곡(Prev)으로 건너뛰기</span></div>
            <div><b><K>S</K></b><span>무작위 셔플(Shuffle) 모드 토글</span></div>
            <div><b><K>R</K></b><span>반복 모드 전환 (반복 안 함 ➔ 전체 반복 ➔ 한 곡 반복)</span></div>
            <div><b><K>M</K></b><span>음소거(Mute) 즉시 토글</span></div>
            <div><b><K>/</K></b><span>재생목록 검색창으로 즉시 포커스 이동</span></div>
          </div>
        </section>

        {/* 8. FAQ */}
        <section id="faq" className="card">
          <h2><HelpCircle size={20} color="#00f2fe" /> ⑧ 자주 묻는 질문 (FAQ)</h2>
          <div className="gd-faq">
            <details>
              <summary>🔊 소리가 나오지 않아요.</summary>
              <p>1. 키보드의 <K>M</K> 키를 눌러 음소거 상태인지 확인해 주세요.<br />2. 플레이어 하단 볼륨 슬라이더 및 운영체제 스피커 볼륨을 확인해 주세요.<br />3. 브라우저의 오디오 자동재생 보안 정책으로 인해, 첫 음원은 반드시 사용자가 [재생] 버튼이나 트랙을 직접 클릭해야 소리가 출력됩니다.</p>
            </details>
            <details>
              <summary>📁 폴더 전체를 한 번에 추가하고 싶어요.</summary>
              <p>플레이어 상단의 <b>[폴더 추가]</b> 버튼을 누르거나, 탐색기에서 음악 파일이 든 폴더 자체를 브라우저 창으로 드래그앤드롭하시면 하위 폴더에 있는 모든 음원을 한 번에 일괄 추가합니다.</p>
            </details>
            <details>
              <summary>📱 모바일 스마트폰이나 태블릿에서도 사용할 수 있나요?</summary>
              <p>네! 모바일 환경에 최적화된 반응형 셸이 적용되어 있으며, 스마트폰 브라우저(Edge, Safari, Chrome 등)에서도 내 기기에 저장된 음악 파일을 추가하여 동일하게 비주얼라이저와 이퀄라이저를 즐기실 수 있습니다.</p>
            </details>
            <details>
              <summary>🇰🇷 구형 MP3의 한글 곡명·가수명이 깨져요.</summary>
              <p>재생목록의 [곡 정보 인코딩]은 기본적으로 자동 감지합니다. 깨진 곡을 선택하고 [한국어 (CP949)]를 고른 뒤 [선택 곡 정보 복구]를 누르세요. 선택하지 않으면 전체 곡을 확인합니다. 서유럽 문자로 된 곡이 잘못 읽히면 [서유럽 (Latin-1)]로 다시 복구할 수 있습니다. 원본 음악·커버·곡 순서·재생 설정은 유지되고 제목·가수·앨범 정보만 다시 읽습니다. 파일에 태그가 없거나 읽기·저장에 실패한 곡은 기존 정보를 유지합니다.</p>
            </details>
            <details>
              <summary>🏷️ 곡 제목 대신 긴 파일 이름으로 나와요.</summary>
              <p>음원 파일에 ID3 메타데이터(가수/곡명 정보)가 누락된 경우입니다. 파일 이름을 `아티스트 - 곡제목.mp3` 형식으로 지정해 주시면 플레이어가 자동으로 인식하여 분리 표시합니다.</p>
            </details>
            <details>
              <summary>🔒 다른 컴퓨터나 휴대폰에서도 내 재생목록이 보이나요?</summary>
              <p>본 프로그램은 회원의 개인 음악 파일 저작권 및 프라이버시 보호를 위해 파일을 외부 서버에 저장하지 않습니다. 따라서 다른 기기에서는 해당 기기에 있는 음악 파일을 새로 추가하셔야 합니다.</p>
            </details>
          </div>
        </section>
      </div>
    </>
  );
}
