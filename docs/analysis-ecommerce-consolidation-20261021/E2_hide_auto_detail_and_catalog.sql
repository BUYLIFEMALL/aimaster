-- 이커머스 병합 E2 + 마무리 — 윈도우 CLI가 적용 (운영 ① AIMaster, ref esgxyikcnnvmlhygjkth)
-- 순서: shop-detail-page v1.17·auto-detail-page v1.21 배포 Ready 뒤에 실행한다.
-- 백업: docs/analysis-ecommerce-consolidation-20261021/backup-programs-before-merge-e.json (description·detail_sections 원문 포함)
-- 권한: 자동생성기 유효 권한 226명은 모두 15p 권한을 이미 가지고 있어 추가 부여 0명(2026-10-21 조회).

-- 1) 자동생성기 숨김 + 버전
update programs set is_active = false, version = 'v1.21', updated_at = now() where slug = 'auto-detail-page';
update programs set version = 'v1.17', updated_at = now() where slug = 'shop-detail-page';

-- 2) 15p 카탈로그 이름·설명(docs/PROGRAM_DESCRIPTION_STANDARD.md 형식). 이름은 2026-10-22 주인님 확정: 「AI 상세페이지 자동화」(이전 「상세페이지 자동화(15p)」).
update programs set
  name = 'AI 상세페이지 자동화',
  short_desc = '상품 사진으로 15섹션·쿠팡 12단·스마트스토어 9단 상세페이지 이미지와 HTML을 만듭니다',
  description = '<p>🛍️ <strong>상품 사진 한 장을 분석해 15섹션·쿠팡 12단·스마트스토어 9단 중 고른 규격으로 상세페이지 이미지를 만드는 프로그램입니다.</strong></p><p>📸 대표 사진·참고 사진과 사양서(PDF·TXT·MD)를 올리면 Gemini가 상품명·특징·스펙·타겟 고객·디자인 톤을 분석해 입력칸을 채우고, 확인·수정한 뒤 저장합니다.</p><p>🎨 섹션마다 원본 사진을 바탕으로 이미지를 만들고, 마음에 들지 않는 섹션만 다시 만들거나 가진 사진으로 바꿉니다. 휴대폰 화면 미리보기로 쇼핑 앱에서 보이는 모습을 확인합니다.</p><p>📥 완성된 섹션을 이어 붙인 860px 긴 PNG로 받거나, 쿠팡·스마트스토어·프리미엄 스타일의 글자를 고칠 수 있는 HTML 상세페이지로 내보냅니다.</p><p>🔑 회원 본인의 Gemini API 키를 사용합니다. 이미지는 본인만 볼 수 있게 보관되고 만든 날로부터 30일 뒤 자동 삭제됩니다. AI가 추정한 스펙·인증·효능 표현은 실제 상품 정보와 맞는지 꼭 확인한 뒤 판매에 쓰세요.</p>',
  detail_sections = '{
    "features": [
      {"icon": "🔍", "title": "사진·사양서로 분석", "desc": "사진과 사양서 PDF를 함께 읽어 상품명·특징·스펙·디자인 톤을 채웁니다."},
      {"icon": "🧩", "title": "마켓별 규격 선택", "desc": "기본 15섹션·쿠팡 로켓배송형 12단·스마트스토어 감성형 9단 중에서 고릅니다."},
      {"icon": "🔁", "title": "섹션별 다시 만들기", "desc": "마음에 들지 않는 섹션만 다시 만들거나 가진 사진으로 바꿉니다."},
      {"icon": "🧾", "title": "긴 PNG·HTML 내보내기", "desc": "860px 긴 이미지 한 장이나 글자를 고칠 수 있는 HTML로 받습니다."}
    ],
    "steps": [
      {"title": "사진·사양서 올리기", "desc": "대표 사진과 참고 사진, 사양서를 올립니다."},
      {"title": "분석 확인·규격 선택", "desc": "AI 분석을 고치고 마켓 규격을 골라 저장합니다."},
      {"title": "섹션 생성", "desc": "섹션 이미지를 만들고 모바일로 미리 봅니다."},
      {"title": "합쳐 받기", "desc": "긴 PNG나 HTML 상세페이지로 내려받습니다."}
    ],
    "audiences": [
      {"icon": "🚀", "title": "쿠팡·스마트스토어 셀러", "desc": "쿠팡 12단·스마트스토어 9단 규격을 골라 마켓에 맞는 섹션 구성으로 바로 만듭니다.", "points": ["마켓 규격 그대로", "860px 긴 이미지"]},
      {"icon": "📄", "title": "사양서가 있는 제조·수입사", "desc": "사양서 PDF를 함께 분석해 소재·치수·인증 같은 사실을 원문 기준으로 채웁니다.", "points": ["정확한 스펙 반영", "문서 재활용"]},
      {"icon": "✏️", "title": "글자를 직접 고치고 싶은 분", "desc": "섹션 이미지를 쓴 HTML 상세페이지로 내보내 문구를 편집기에서 바로 고칩니다.", "points": ["문구 수정 간편", "섹션별 재생성"]}
    ]
  }'::jsonb,
  updated_at = now()
where slug = 'shop-detail-page';

-- 3) 확인
select slug, name, is_active, version, left(short_desc, 40) from programs where slug in ('shop-detail-page','detail-page-12p','auto-detail-page');
