# Threads 콘텐츠 운영 자동화 — 디자인 핸드오프 (DESIGN_HANDOFF.md)

> **공식 적용 템플릿**: **42. Threads 오리지널 바이럴 인텔리전스 랩 스타일 (Threads Original Viral Intelligence Lab Style)**  
> **적용 버전**: `v2.22`  
> **기준 프로그램**: `threads-content-ops` (Group 3 SNS 바이럴 & 플랫폼 오퍼레이션 공식 표준 레퍼런스)  
> **배포 상태**: 로컬 빌드(`npm run build`) 및 테스트(36/36) 100% 통과, 로컬 검증 완료(묶음 배포 대기)

---

## 1. 비주얼 톤앤매너 및 컬러 팔레트 토큰

| 토큰명 | 색상 코드 (HEX) | 용도 | 비고 |
|---|---|---|---|
| `--bg-main` | `#FFFFFF` | 메인 페이지 바탕색 및 카드 배경 | 퓨어 화이트 라이트 테마 |
| `--bg-sub` | `#F8FAFC` | 사이드바, 서피스 보조 배경 | 소프트 쿨 슬레이트 |
| `--threads-dark` | `#0F172A` / `#18181B` | 헤더, 브랜드 아이콘, 폰 목업 테두리 | Meta Threads 공식 다크 감성 |
| `--viral-amber` | `#F59E0B` ~ `#D97706` | 시그니처 3D 액센트, 즉시 생성/발행 버튼 | 바이럴 파이어 앰버 |
| `--border-base` | `#E2E8F0` | 카드 테두리 및 섹션 구분선 | 깔끔한 1px 슬레이트 보더 |
| `--emerald-live` | `#10B981` / `#059669` | 실시간 연결 정상 인디케이터, 완료 뱃지 | 안정적인 가동 상태 피드백 |

---

## 2. 3D 엠보싱 버튼 공식 규격

### 1) `.btn-3d-amber` (Primary 핵심 액션)
- `background`: `linear-gradient(180deg, #F59E0B 0%, #D97706 100%)`
- `border`: `1px solid #B45309`
- `box-shadow`: `0 4px 0 #92400E, 0 6px 14px rgba(217, 119, 6, 0.35)`
- `color`: `#ffffff` (font-weight: 800)
- `hover`: `transform: translateY(-1.5px)`, `box-shadow: 0 5.5px 0 #92400E, 0 8px 18px rgba(217, 119, 6, 0.45)`
- `active`: `transform: translateY(2px)`, `box-shadow: 0 1px 0 #92400E`

### 2) `.btn-3d-threads` (Secondary 브랜드 액션)
- `background`: `linear-gradient(180deg, #18181B 0%, #09090B 100%)`
- `border`: `1px solid #27272A`
- `box-shadow`: `0 4px 0 #000000, 0 6px 14px rgba(0, 0, 0, 0.4)`
- `color`: `#ffffff` (font-weight: 800)
- `hover`: `transform: translateY(-1.5px)`, `box-shadow: 0 5.5px 0 #000000, 0 8px 18px rgba(0, 0, 0, 0.5)`
- `active`: `transform: translateY(2px)`, `box-shadow: 0 1px 0 #000000`

---

## 3. 핵심 시그니처 컴포넌트

1. **상시 1:1 스마트폰 Threads 모바일 피드 뷰파인더 덱 목업 (`phone-mockup`)**:
   - `max-w-[360px]` 둥근 모서리(`rounded-[32px]`), 상단 9:41 노치 바, 원형 계정 아바타 + @아이디, 500자 본문 실시간 렌더, 첨부 이미지 카드(1080×1080), 좋아요/댓글/리포스트/공유 아이콘 일체화.
2. **500자 제약 안전 구간 링 프로그레스 바 & 카운터**:
   - Threads 본문 500자 초과 방지를 위한 3단계 색상 인디케이터 (안전 초록 ➔ 450자 이상 주의 주황 ➔ 500자 초과 경고 빨강 + 펄스 모션).
3. **6대 바이럴 페르소나 알약 칩셋**:
   - 일상 공감형, 데이터 분석가형, 사이다 직설형, 지식 큐레이터형, 솔직 쇼퍼형, 스토리텔러형 쾌속 탭 전환.
4. **2단 분리형 API 키 연동 카드**:
   - 1행 플랫폼 명칭/상태 + 발급 바로가기 링크 버튼, 2행 마스킹 입력창 + 모델 선택 셀렉트박스.

---

## 4. 검증 결과

- **테스트**: `node --test tests/*.test.cjs` 36개 모의 검사 100% 통과
- **빌드**: `npm run build` 컴파일 무결성 통과 (정적 페이지 5개 생성)
- **실세션 검수**: 1440px 고화질 쇼케이스(`http://localhost:3800/showcase.html`) 및 1440px 라이트박스 팝업 확인 완료
