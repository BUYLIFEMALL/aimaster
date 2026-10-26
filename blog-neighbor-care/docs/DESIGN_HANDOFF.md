# 디자인 담당 전달 — 백엔드 1단계

> **읽기연결시험(2026-10-27):** 설치·연결·받은글확인용 `/reader`와확장팝업을시험용으로준비했습니다. 기존연결흐름과3D CTA를사용하며정식4화면디자인/템플릿선정/12뷰승인완료가아닙니다. 운영적용승인전미배포. [범위/검수/남은정식디자인](IMPROVEMENT_HANDOFF_20261027_READER_EXTENSION.md).

> **2026-10-27 계약추가:** `POST /api/material/preview`의 `summary_preview`는검색요약 사전선별, `text_preview`는회원제공본문정리입니다. 둘다관계unknown·계정미검증·자동소통불가·AI분석미수행·저장안함. 권리확인은회원진술이며 독립검증아님. UI에서완성된프로필/적합도점수/네이버확인배지로표시하지않습니다. [입력/결과·검수](IMPROVEMENT_HANDOFF_20261027_MATERIAL_PREVIEW.md). 디자인시안/승인조건유지.

2026-10-26. 이번코드는API/SQL만이며디자인·템플릿·자산은제작/수정하지않았습니다. UI는디자인담당의4대화면3시안·주인님선택이후구현합니다.

| 화면 | 서버표시계약 |
|---|---|
| 메인 | 로그인/권한·프로그램활성확인, runtime라이브준비상태, 회원전체기기합산상한20/100/30, ON/OFF·중단/결과확인필요 |
| 상세 | 본인공용연결계정참조·대상·문장·승인/설정revision. 수정시재승인. 서로이웃미확인/공감불명/성공불명상태를구별 |
| 매뉴얼 | 본인키/공용계정→후보/승인→실행모드→실제결과. APIHUB검색은요약까지이며쓰기권한과별도 |
| 설정 | 최초OFF/review·상한0~앱최대, 활성화와모드저장분리. 라이브게이트미준비/미해결uncertain이있으면ON거절 |

현재회원API는`POST /api/work`의settings/list/configure/create/approve/edit만허용합니다. observe/claim/arm/verify_permit/result는신뢰된서버worker전용이며브라우저문장승인을게시성공보고로취급하지않습니다. 본인공용계정연결기능은후속단계로아직없습니다.

기존[0-A 화면계약](../../docs/analysis-naver-blog-neighbor-20261024/SPEC_20261026_BLOG_NEIGHBOR_CARE_0A.md)과rootDESIGN/매뉴얼규격을따르고,시안/채택·비선택자산은D:\Antigravity\Design에보존합니다. 다른담당5번연계·기존앱화면은이번범위밖입니다.
