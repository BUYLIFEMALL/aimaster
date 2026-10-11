# YOUTUBE CHANNEL CONSULTANT

유튜브 채널과 키워드를 분석해 성장 인사이트를 찾는 채널 컨설턴트입니다. 회원 본인의 YouTube Data API v3 키로 동작합니다(운영자·타인 키 사용 없음).

## 기능 (v1.01)
1. **채널 분석 (`/channel-analysis`)** — 채널 이름·@핸들·주소로 구독자·총 조회수·영상 수·개설일·평균 업로드 주기를 보고, 최근 영상 50/100/200개의 인기 점수 차트(인기 점수·조회수·좋아요·댓글·타임라인·콘텐츠 포맷)와 영상 목록(전체/일반/쇼츠 필터, 정렬, JSON·CSV 내보내기)을 제공합니다.
2. **키워드 분석 (`/keyword-analysis`)** — 지역·카테고리·검색 기준을 정해 검색된 영상(최대 50/100개)의 조회수·좋아요·댓글, 채널 점유율, 영상 게시 시기를 분석합니다. 영상 카드의 채널명을 누르면 그 채널을 바로 분석합니다.
3. **API키등록·플랫폼연동 (`/settings`)** — YouTube 키(필수)와 이후 AI 분석용 Gemini/OpenAI/Claude 키(선택) 등록, 연동 매뉴얼 팝업.

## 설계 메모
- 분석 결과는 서버에 저장하지 않습니다. 지표 정의(인기 점수, 쇼츠 추정, 분석 범위)와 쿼터 계산은 `AGENTS.md` 4~5절에 있습니다.
- `youtube-viral-studio`의 로그인·권한·키 저장 구조를 바탕으로 만들었고, 권한 판정은 루트 `lib/access/checkProgramAccess.ts`의 사본을 씁니다.

## 개발
```bash
npm run dev     # http://localhost:3000 (.env.local 필요)
npm test        # 지표 계산 자동 검사
npm run build
```
