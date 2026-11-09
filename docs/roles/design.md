# 디자인

- 담당: Antigravity(`agy`, 윈도우) — 최근 세션 `agy-win-mvs-v2`
- 맡은 폴더: `threads-content-ops` (Group 3 대표 모델)
- 카테고리: 전체(디자인)
- 주력 업무: UI/UX 디자인 업그레이드·매뉴얼 시각화(`DESIGN.md`, `docs/PROGRAM_DESIGN_STANDARD.md`). 브라우저는 웨일
- 핵심 배포 원칙 (2026-10-29 주인님 지시): 작업한 내용의 실제 배포는 비용 절감을 위해 꼭 당장 필요한 것(긴급/치명 오류)이 아니면 로컬 검수 완료 상태로 모아두었다가 **한 번에 묶음(Batch)으로 반영**한다. 급한 것만 최소한으로 단독 반영.
- 마지막 갱신: 2026-11-09 09:20 (agy-win-tpf-v2)
- 최근 업데이트: 2026-11-09 09:20 (trending-product-finder 실시간 급상승 소싱 트렌드 발굴기 v1.37 1안 70. 퀀트 이커머스 인텔리전스 레이더 덱 공식 채택 전면 리뉴얼 및 Vercel 프로덕션 배포 완료)

## 지금 하는 일
| 프로그램 | 작업 | 시작 | 상태 |
|---|---|---|---|
| 차기 디자인 리뉴얼 | 주인님 차기 리뉴얼 대상 프로그램 지시 대기 | 2026-11-09 | 대기 중 |

## 대기 중 (주인님 승인·결정 대기 포함)
| 프로그램 | 작업 | 기다리는 것 | 근거 문서 |
|---|---|---|---|
| 차기 리뉴얼 프로그램 | 4대 화면 3시안 작업 대상 프로그램 확정 | 주인님 지시 | `DESIGN.md` 현황판 |

## 최근 완료 (최근 10개)
| 날짜 | 프로그램·버전 | 한 일 | 배포 |
|---|---|---|---|
| 2026-11-09 | `trending-product-finder` `v1.37` | 1안(70. 퀀트 이커머스 인텔리전스 레이더 덱 스타일) 공식 채택 전면 개편, 2026-11-01 5단계 표준 로그인 폼 & 1행 약관 개편, 4단계 파이프라인 배너 & 3D 엠보싱 사이안 버튼(`.btn-3d-cyan`) 탑재, 단위테스트 43/43 & 권한테스트 15/15 100% 통과, Vercel 프로덕션 배포 및 라이브 검수 완료 | ✅ 프로덕션 배포 완료 (`dpl_6uqyP6eFeFHJEPjwAxfh4KVzf1N3`, https://trending-product-finder.buylife.xyz) |
| 2026-11-09 | `trending-product-finder` `v1.36` | 4대 화면 3시안(12개 뷰) 1440px 고화질 캡처 및 `http://localhost:3800/showcase.html` 단일 통합 쇼케이스 & `comparison.html` 종합 비교 매트릭스 표 구축, `D:\Antigravity\Design` 3대 독립 폴더(70/71/72번) 영구 자산 아카이빙 완료 | 🔍 쇼케이스 호스팅 완료 (`http://localhost:3800`) |
| 2026-11-09 | `free-music-studio` | 63번 사이버 DAW 네온 스튜디오 테마 16:9 시네마틱 썸네일 생성, Supabase Storage `program-images` 업로드 및 `programs` 테이블 `thumbnail_url` 갱신 반영 완료 (메인 사이트 카드 즉시 노출) | ✅ Supabase Storage & DB 등록 완료 |
| 2026-11-08 | `shorts-viral-studio` `v2.00` | 1안(24. 유튜브 쇼츠 크리에이터 레드 & 화이트 스튜디오 스타일) 공식 채택 전면 개편, 2026-11-01 5단계 표준 로그인 폼 & 1행 약관 개편, 9:16 모바일 쇼츠 뷰파인더 덱 및 3D 엠보싱 유튜브 레드 버튼(`.btn-3d-yt-red`) 탑재, 단위테스트 17/17 100% 통과, Vercel 프로덕션 배포 및 라이브 검수 완료 | ✅ 프로덕션 배포 완료 (`dpl_HbgXQvvWjcmQHkG32qhTUCQh1rqA`, https://shorts-viral-studio.buylife.xyz) |
| 2026-11-08 | `banana-canvas` `v1.45` | 2안(68. 크리에이티브 아뜰리에 페이퍼 팝 스타일) 공식 채택 전면 개편, 2026-11-01 5단계 표준 로그인 폼 & 1행 약관 개편, 4단계 아뜰리에 파이프라인 배너 및 3D 엠보싱 팝 버튼(`.btn-3d.btn-3d-pop`) 탑재, 단위테스트 80/80 100% 통과, Vercel 프로덕션 배포 및 라이브 검수 완료 | ✅ 프로덕션 배포 완료 (`dpl_GtgjmKKtLGNPqZeLStrmBnySPeRg`, https://banana-canvas.buylife.xyz) |
| 2026-11-08 | `portrait-photo` `v1.45` | 1안(61. 어도비 하이퍼 크리에이티브 다크 데스크 스타일) 공식 채택 전면 개편, 2026-11-01 5단계 표준 로그인 폼 & 1행 약관 개편, 4단계 스튜디오 파이프라인 배너 및 3D 엠보싱 앰버 버튼(`.btn-3d-amber`) 탑재, 단위테스트 47/47 100% 통과, Vercel 프로덕션 배포 및 라이브 검수 완료 | ✅ 프로덕션 배포 완료 (`dpl_4XZxhoCqe28fxpuJZm9aktKxVtgx`, https://portrait-photo.buylife.xyz) |
| 2026-11-07 | `free-music-studio` `v1.33` | 1안(63. 사이버 DAW 네온 스튜디오 덱 스타일) 공식 채택 전면 개편, 2026-11-01 5단계 표준 로그인 폼 & 1행 약관 개편, 6단계 DAW 트랙 파이프라인 배너 & 24트랙 오디오 파형 뷰파인더 덱 탑재, 단위테스트 88개 100% 통과, Vercel 프로덕션 배포 및 라이브 검수 완료 | ✅ 프로덕션 배포 완료 (`dpl_2MqJeoarXY7J1sxcSiWxs3suzPLX`, https://free-music-studio.buylife.xyz) |
| 2026-11-07 | `threads-content-ops` `v2.25` | 1안(42. Threads 오리지널 바이럴 인텔리전스 랩 스타일) 공식 채택 전면 개편, 2026-11-01 5단계 표준 로그인 폼 & 1행 약관 개편, 4단계 바이럴 파이프라인 인디케이터 배너 탑재, 500자 3단계 게이지 및 1:1 모바일 피드 뷰파인더 덱 목업 탑재, 단위테스트 40/40 100% 통과, Vercel 프로덕션 배포 및 라이브 검수 완료 | ✅ 프로덕션 배포 완료 (`dpl_2yXXtg4TW2Hn81EdDAWN51MDzaLQ`, https://threads-content-ops.buylife.xyz) |
| 2026-11-07 | `threads-content-ops` `v2.25` | 1안(42. Threads 오리지널 바이럴 인텔리전스 랩 스타일) 공식 채택 전면 개편, 2026-11-01 5단계 표준 로그인 폼 & 1행 약관 개편, 4단계 바이럴 파이프라인 인디케이터 배너 탑재, 500자 3단계 게이지 및 1:1 모바일 피드 뷰파인더 덱 목업 탑재, 단위테스트 40/40 100% 통과, Vercel 프로덕션 배포 및 라이브 검수 완료 | ✅ 프로덕션 배포 완료 (`dpl_2yXXtg4TW2Hn81EdDAWN51MDzaLQ`, https://threads-content-ops.buylife.xyz) |
| 2026-11-06 | `allinone-graphic` `v1.20` | 1안(60. 피그마 프로 비주얼 캔버스 아틀리에 스타일) 공식 채택, 4단계 파이프라인 배너, 3D 엠보싱 인디고 버튼(`.btn-3d-indigo`) & 5단계 표준 로그인 및 1행 약관 탑재, 단위테스트 5/5 통과 및 Vercel 프로덕션 배포 완료 | ✅ 프로덕션 배포 완료 (`dpl_GTGQ8aupKpjgDiR9EZK4CGYxA1wz`, https://graphic.buylife.xyz) |
| 2026-11-06 | `cinematic-storyboard-studio` `v1.19` | 1안(57. 헐리우드 9컷 시네마틱 디렉터스 뷰파인더 스타일) 공식 채택, LIVE 🔴 REC 실시간 타임코드 뷰파인더 덱 & 4단계 파이프라인 배너, 3D 엠보싱 헐리우드 레드 버튼(`.btn-3d-red`, `.btn-3d-shorts`) & 5단계 표준 로그인 탑재, 단위테스트 23/23 통과 및 Vercel 프로덕션 배포 완료 | ✅ 프로덕션 배포 완료 (`dpl_6MkrHSfBnVZ56chuejUx2YZBKbAz`, https://cinematic-storyboard-studio.buylife.xyz) |
| 2026-11-06 | `video-to-gif` `v1.27` | 1안(54. 시네마틱 헐리우드 네온 REC 렌더러 스타일) 공식 채택, LIVE 🔴 REC 타임코드 뷰파인더 덱 & 4단계 파이프라인 배너, 원클릭 마켓 최적화 프리셋 칩, 3D 엠보싱 헐리우드 레드 버튼(`.btn-3d-red`, `.btn-3d-shorts`) & 5단계 표준 로그인 탑재, 로컬 빌드 및 Vercel 프로덕션 배포 완료 | ✅ 프로덕션 배포 완료 (`dpl_6NfgPdQE296T4hkytWnDzhrSF8GP`, https://video-to-gif.buylife.xyz) |
| 2026-11-06 | `ai-video-studio` `v1.28` | 1안(51. 유튜브 쇼츠 크리에이터 레드 스튜디오 스타일) 공식 채택, 9:16 모바일 뷰파인더 덱 목업(LIVE REC 00:00:04:18, 4K UHD, 60 FPS) & 4단계 시네마틱 파이프라인 배너 & 3D 엠보싱 쇼츠 레드 버튼(`.btn-3d-red`) & 5단계 표준 로그인 탑재, 단위테스트 82/82 100% 통과 및 프로덕션 배포 완료 | ✅ 프로덕션 배포 완료 (`dpl_2vqjT6bQeZaAsKjDej2cBnAdTatV`, https://ai-video-studio.buylife.xyz) |
| 2026-11-06 | 전체 지침 | [주인님 지시] 디자인 UI 시안 생성 지침 공식 등록 (쇼케이스 상단 종합 비교표 필수, 1440px 라이트박스 팝업, 순수 영문 URL 1순위 제공, D:\\Antigravity\\Design 폴더별 100% 자산화) | AGENTS.md, GEMINI.md, DESIGN.md 반영 |
| 2026-11-06 | `shop-detail-page` `v1.42` | 48. 하이퍼 이커머스 셀러 스튜디오 스타일 채택, 4단계 파이프라인 배너, 3D 엠보싱 로열블루 버튼 및 5단계 표준 로그인 적용 | ✅ 프로덕션 배포 완료 (`dpl_E1GFe4mcEbVctye1a4b3sWdBsJNZ`, https://shop-detail-page.buylife.xyz) |
| 2026-11-06 | `music-video-studio` `v1.27` | 45. 시네마틱 네온 MV 비주얼라이저 스튜디오 스타일 채택, 16:9 뷰파인더 덱 목업 탑재, 3D 엠보싱 마젠타 버튼 및 5단계 표준 로그인 적용 | ✅ 프로덕션 배포 완료 (`dpl_9uuXECD4PJybgqVuAqpXe8616MSj`, https://music-video-studio.buylife.xyz) |
| 2026-11-06 | 	hreads-content-ops 2.23 | 1안(42. Threads 오리지널 바이럴 인텔리전스 랩 스타일) 공식 채택, 1:1 모바일 피드 뷰파인더 덱 & 500자 링 게이지 탑재, Vercel 프로덕션 배포 및 라이브 검증 완료 | 프로덕션 배포 완료 (v2.23) |
|---|---|---|---|
| 2026-10-30 | `thumbnail-master` v2.0 | 4대 화면 3시안(12뷰) 쇼케이스 및 1440px 라이트박스 팝업 제작, 주인님 확정 2안(31. 유튜브 네온 사이버 비주얼 스튜디오 스타일) 전면 리뉴얼, 3D 엠보싱 사이안 버튼 및 CTR 뇌파 시뮬레이터 HUD 탑재, 빌드 무결성 통과 및 프로덕션 배포 완료 | 배포 완료 (`https://thumbnail-master.buylife.xyz`) |
| 2026-10-30 | `youtube-viral-studio` v2.0 | 4대 화면 3시안(12뷰) 쇼케이스 제작 및 1440px 라이트박스 팝업 검증 완료, 주인님 확정 2안(골든 엠파이어 레이더 딥블랙 & 골드 인텔리전스 스타일) 전면 리뉴얼, VPH 배지·구독자 역전 배수 오버레이·3D 엠보싱 버튼 장착, fixture 단위테스트 100% 통과 및 프로덕션 배포 완료 | 배포 완료 (`https://youtube-viral-studio.buylife.xyz`) |
| 2026-10-30 | `shorts-viral-studio` v2.0 | 4대 화면 3시안(12뷰) 쇼케이스 및 1440px 라이트박스 팝업 제작, 24. 유튜브 쇼츠 크리에이터 레드 & 화이트 스튜디오 스타일 확정 적용, 9:16 모바일 뷰파인더 덱 및 3D 엠보싱 버튼 탑재, 단위테스트 17/17 통과 및 로컬 빌드 성공 | 로컬 검증 완료(묶음 배포 대기) |
| 2026-10-30 | `shorts-onestop-studio` v2.0 | 1안(24. 유튜브 쇼츠 크리에이터 레드 & 화이트 스튜디오 스타일) 확정 적용, 9:16 실시간 쇼츠 폰 뷰파인더 덱 통합 및 CSS 레이아웃/헤더 격리 전면 완료, 테스트 33개 100% 통과 및 프로덕션 배포 완료 (주인님 검수 완료: 「잘했다」) | 배포 완료 (`https://shorts-onestop-studio.buylife.xyz`) |
| 2026-10-29 | `shorts-onestop-studio` | 시안 1 사용자 피드백(유튜브 느낌, 너무 어두운 톤 개선) 반영: 24. 유튜브 쇼츠 크리에이터 레드 & 화이트 스튜디오 스타일 전면 리터치, 1440px 고해상도 캡처 4종 갱신, 쇼케이스 연동 및 D:\Antigravity\Design 영구 저장 완료 | 쇼케이스 완료 (`http://localhost:3800/showcase.html`) |
| 2026-10-29 | 전체 디자인 지침 | 디자인 시안 웹 쇼케이스 및 라이트박스 원본 팝업 제안 규격(`http://localhost:3800/showcase.html`, 1440px 팝업, `D:\Antigravity\Design\<템플릿명>` 독립 영구 저장) 지침 등재 | DESIGN.md, AGENTS.md, GEMINI.md 반영 완료 |
| 2026-10-29 | `banana-canvas` v1.42 | 바나나 로고 시인성 극대화 리디자인(배경 노란색 묻힘 해결 ➔ 딥 웜 차콜 엠블럼 + 3D 골든 바나나 SVG 벡터) 및 'Nano Studio' 문구 영구 삭제 (2026-10-29 주인님 지시) | 로컬 검증 완료(묶음 배포 대기) |
| 2026-10-29 | 전체 영상·음악 프로그램 | **「시네마틱 앰버 렌더 스튜디오 스타일」** 영상·음악 공식 대표 레퍼런스 템플릿 지정(`video-to-gif` v1.25 기준) 및 `DESIGN.md`, `PROGRAM_DESIGN_STANDARD.md` 지침 공식 등재 (2026-10-29 주인님 지시) | 지침 반영 완료 |
| 2026-10-29 | 전체 프로그램 | 긴 프로그램명 사이드바 표기 시 어절 중간 분절 방지 및 문맥 맞춤 2열 줄바꿈 + 2열 끝 버전 뱃지 인라인 결합(`smartstore-register`, `shop-order-report`) 및 사이드바 헤더 폭 확보(`video-to-gif` 배지 내 'STUDIO' 삭제 ➔ 'AI 영상렌더 스튜디오' 1행 한줄 표기 복원) 적용 (2026-10-29 주인님 지시) | 로컬 검증 완료(묶음 배포 대기) |
| 2026-10-28 | 전체 크롬 확장 | 크롬 확장 프로그램 UI 기본 레이아웃 메인 표준(4단 기본 골격 필수 기준) 제정 및 프로그램별 색상·스타일 맞춤 적용 원칙 수립, 지침 공식 등재 | 지침 반영 완료 |
| 2026-10-28 | 전체 네이버 프로그램 | 네이버 스마트스토어 센터 공식 버튼(저장하기 #00c73c, 미리보기 #8991a3 등 4대 위계) 및 UI 컬러 시스템 분석, 영구 자산(`D:\Antigravity\Design\naver_reference`) 적재 및 메인 디자인 지침 공식 등재 | 지침 반영 완료 |
| 2026-10-26 | `shop-detail-page` v1.38 | E3 편집 화면 다듬기(배송안내/블록편집/말투5종) UI/UX 고도화, 7. 이커머스 셀러 스튜디오 스타일 일체화 및 3D 엠보싱 버튼 장착, Whale/Edge 검수 및 자산 영구 보존 | 배포 완료 (`https://shop-detail-page.buylife.xyz`) |
| 2026-10-26 | `shots` v1.44 | Group 2 대표 유튜브 쇼츠 4대 화면 3시안 제작 및 21. 헐리우드 시네마틱 네온 REC 스타일 확정 적용, WebCodecs GPU 가속 1080p 렌더러 & 3D 엠보싱 버튼 탑재, Whale 실세션 검수 및 D:\Antigravity\Design 자산 영구 적재 | 배포 완료 (`https://shots.buylife.xyz`) |
| 2026-10-26 | `naver-blog-allinone` v1.55 | 4대 화면 3시안(12개 뷰) 주인님 1번 확정 승인 반영, 18번 네이버 스마트 그린 저널 템플릿 확정 적용, 3종 포스팅 모드 칩셋 & 3D 엠보싱 버튼 탑재, Whale 실세션 검수 및 D:\Antigravity\Design 자산 영구 적재 | 배포 완료 (`https://naver-blog-allinone.buylife.xyz`) |
| 2026-10-26 | `blog-content-maker` v1.13 | 4대 화면 3시안(12개 뷰) 제작 및 네이버 공식 시그니처 그린(#03c75a) 톤 보정, 18번 네이버 스마트 그린 저널 템플릿 확정 적용, 3종 포스팅 모드 칩셋 & 3D 엠보싱 버튼 탑재, Whale 검수 및 D:\Antigravity\Design 자산 영구 적재 | 배포 완료 (`https://blog-content-maker.buylife.xyz`) |
| 2026-10-26 | `blog-workroom` v1.15 | 4대 화면 3시안(12개 뷰) 주인님 1번 확정 승인 반영, 18번 네이버 스마트 그린 저널 메인 템플릿 확정 적용, 3종 포스팅 모드 칩셋 & 3D 엠보싱 버튼 탑재, D:\Antigravity\Design 자산 영구 적재 | 배포 완료 (`https://blog-workroom.buylife.xyz`) |
| 2026-10-26 | `naver-blog-seo-studio` v2.21 | 4대 화면 3시안(12개 뷰) 주인님 1번 확정 승인 반영, 18번 네이버 스마트 그린 저널 메인 템플릿 확정 적용, 3종 포스팅 모드 칩셋 & 3D 엠보싱 버튼 탑재, D:\Antigravity\Design 자산 영구 적재 | 배포 완료 (`https://naver-blog-seo-studio.buylife.xyz`) |
| 2026-10-25 | `ai-auto-blog` v1.82 | 4대 화면 3시안 검수 및 네이버 스마트 그린 저널 스타일 확정 적용, 3종 포스팅 모드 칩셋 & 3D 버튼 탑재 | 배포 완료 (`https://ai-auto-blog.buylife.xyz`) |
| 2026-10-25 | `tistory-auto-blog` v1.47 | 4대 화면 3시안 검수 및 클린 에디토리얼 오렌지 스타일 확정 적용, 3D 엠보싱 버튼 탑재 | 배포 완료 (`https://tistory-auto-blog.buylife.xyz`) |
| 2026-10-25 | 디자인 템플릿 자산 보존 헌장 | `D:\Antigravity\Design` 20대 전체 템플릿 자산 영구 보존 및 `DESIGN.md`, `docs/DESIGN_TEMPLATE_CATALOG.md` 등재 | 지침 반영 완료 |

## 다음 첫 단계
1. 이 파일 확인·보완

## 주인님께 여쭐 것
- 없음
