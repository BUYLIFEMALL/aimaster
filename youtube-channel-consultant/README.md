# YOUTUBE CHANNEL CONSULTANT

유튜브 채널과 키워드를 분석해 성장 인사이트를 찾는 채널 컨설턴트입니다. 회원 본인의 YouTube Data API v3 키로 동작합니다(운영자·타인 키 사용 없음).

## 기능 (v1.03)
1. **채널 분석 (`/channel-analysis`)** — 채널 이름·@핸들·주소로 구독자·총 조회수·영상 수·개설일·평균 업로드 주기를 보고, 최근 영상 50/100/200개의 인기 점수 차트(인기 점수·조회수·좋아요·댓글·타임라인·콘텐츠 포맷)와 영상 목록(전체/일반/쇼츠 필터, 정렬, JSON·CSV 내보내기)을 제공합니다.
2. **키워드 분석 (`/keyword-analysis`)** — 지역·카테고리·검색 기준을 정해 검색된 영상(최대 50/100개)의 조회수·좋아요·댓글, 채널 점유율, 영상 게시 시기를 분석합니다. 영상 카드의 채널명을 누르면 그 채널을 바로 분석합니다.
3. **AI 분석 (v1.02)** — 채널 분석: 경쟁 전략·성장 과정·채널 진단 및 컨설팅, 키워드 분석: 경쟁 전략, 영상 카드: AI 영상 요약(Gemini는 영상을 직접 봄). 회원 본인의 Gemini/OpenAI/Claude 키로 호출합니다.
4. **공략 채널 찾기 (`/golden-channels`)** — 키워드로 최근 인기 영상을 찾고, 구독자는 적은데 채널 평균 조회수가 높은 소형 고효율 채널을 파괴력 배수순으로 보여줍니다.
5. **API키등록·플랫폼연동 (`/settings`)** — YouTube 키(필수)와 AI 키(선택) 등록, 연동 매뉴얼 팝업.

## 설계 메모
- 분석 결과는 서버에 저장하지 않습니다. 지표 정의(인기 점수, 쇼츠 추정, 분석 범위)와 쿼터 계산은 `AGENTS.md` 4~5절에 있습니다.
- `youtube-viral-studio`의 로그인·권한·키 저장 구조를 바탕으로 만들었고, 권한 판정은 루트 `lib/access/checkProgramAccess.ts`의 사본을 씁니다.

## 개발
```bash
npm run dev     # http://localhost:3000 (.env.local 필요)
npm test        # 지표 계산 자동 검사
npm run build
```


## 2026-10-16 DB 연동 변수 호환 — v1.06 (youtube-channel-consultant)

작업 전 [최상위 데이터베이스 연동 지침](../docs/DATABASE_CONNECTION_POLICY.md)과 [전체 전환 인수인계](../docs/DATABASE_CONNECTION_HANDOFF.md)를 먼저 읽습니다. 공개 키는 새 PUBLISHABLE 이름 우선·기존 ANON 이름 호환, 서버 키는 새 SECRET 이름 우선·기존 SERVICE_ROLE 이름 호환입니다. 새 값 없음/공백일 때만 같은 종류의 기존 값을 사용하며, 인증 실패 후 다른 키로 재시도하지 않습니다. 기존 변수·실제 키·회원 권한·Cron은 유지합니다. 배포·회원 검수 결과는 전체 인수인계의 프로그램별 기록에서 확인합니다. 기존 변수 삭제와 실제 키 폐기는 별개이며 안정화 확인 전 삭제하지 않습니다.

## 디자인 (v1.07)
- [디자인 인수인계](docs/DESIGN_HANDOFF.md) · [개선 원장](docs/IMPROVEMENTS.md) · [인수인계 2026-10-17](docs/IMPROVEMENT_HANDOFF_20261017.md)
