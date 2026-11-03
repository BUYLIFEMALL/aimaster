-- AI 중개사무소 고객관리 공개(2026-11-03, 주인님 결정 3 「회원에게 공개」). 대상: AIMaster 운영 DB esgxyikcnnvmlhygjkth.
-- 「준비중」(coming) 배지 → NEW, 상세 소개·한 줄 요약·특징·사용 순서·추천 대상을 1~4단계 기능으로(docs/PROGRAM_DESCRIPTION_STANDARD.md), VIP 등급 자동 부여 켜기(다른 부동산 프로그램과 같음).
-- 썸네일은 scripts/generate-program-thumbnail.mjs로 별도 반영(programs.thumbnail_url). 바꾸기 전 설명 원문: 20261103010100_register_program.sql.
update public.programs set
  badges = array['new']::text[],
  short_desc = '관심고객 동의 접수부터 맞는 매물 안내 문자, 계약·잔금 일정 알림까지 챙기는 중개사무소 고객관리입니다.',
  description = $d$<p>🏢 <strong>중개사무소의 관심고객을 동의와 함께 모으고, 내 매물과 맞는 고객에게 안내하고, 계약·잔금·만기 일정까지 챙깁니다.</strong></p><p>🔗 사무소 전용 접수 링크로 고객이 로그인 없이 원하는 거래·지역·예산을 남기고, 수집 동의와 광고 문자 동의를 따로 고릅니다. 전화 고객은 동의 확인과 함께 직접 넣습니다.</p><p>🏠 매물을 넣으면 거래·종류·동·예산·면적이 맞는 고객이 나오고, 직접 고른 고객에게만 안내 문자를 보냅니다. 「(광고)」 표시와 무료 수신거부 링크가 자동으로 붙고, 밤 시간과 동의하지 않은 고객은 막습니다.</p><p>📅 임장·계약·잔금·만기 일정을 넣으면 정한 날 아침 8시에 내 핸드폰으로 알려 드립니다.</p><p>✨ 매물 광고에 빠진 명시 항목을 짚어 주고, 광고 글·문자 초안을 만들어 고쳐 쓸 수 있습니다.</p><p>🔑 문자는 회원 본인 SOLAPI 계정, AI 초안은 회원 본인 Claude API 키를 사용합니다. 고객 명부는 내 사무소만 보고 마지막 상담일부터 1년 뒤 정리되며, 법령 안내는 참고용입니다.</p>$d$,
  detail_sections = $j${
    "features": [
      {"icon": "🔗", "title": "동의 기록 접수 링크", "desc": "고객이 로그인 없이 조건을 남기고, 수집·광고 동의 일시가 함께 남습니다."},
      {"icon": "🏠", "title": "맞는 고객 골라 안내", "desc": "매물 조건과 맞는 고객을 보여 주고, 고른 고객에게만 문자를 보냅니다."},
      {"icon": "📵", "title": "광고 문자 규칙 자동", "desc": "「(광고)」·무료 수신거부 링크를 붙이고 밤 시간·미동의 고객을 막습니다."},
      {"icon": "📅", "title": "아침 8시 일정 알림", "desc": "임장·계약·잔금·만기를 정한 날 아침 내 핸드폰으로 알려 줍니다."}
    ],
    "steps": [
      {"title": "사무소·문자 연결", "desc": "사무소 정보와 본인 SOLAPI 계정을 저장합니다."},
      {"title": "관심고객 모으기", "desc": "접수 링크를 공유하고 전화 고객은 직접 넣습니다."},
      {"title": "매물 넣고 안내", "desc": "맞는 고객을 골라 미리보기를 보고 문자를 보냅니다."},
      {"title": "일정 넣고 알림 받기", "desc": "계약·잔금·만기를 넣고 아침 알림을 받습니다."}
    ],
    "audiences": [
      {"icon": "🧑‍💼", "title": "고객 명단을 수첩·엑셀로 관리하던 개업공인중개사", "desc": "흩어진 매수·임대 문의를 조건별 명부로 모으고, 누가 언제 동의했는지 함께 남깁니다.", "points": ["동의 기록", "조건별 거르기"]},
      {"icon": "📱", "title": "새 매물을 문자로 돌리던 사무소", "desc": "조건이 맞는 고객만 골라 「(광고)」·무료 수신거부가 붙은 안내 문자를 보냅니다.", "points": ["맞는 고객만", "광고 규칙 자동"]},
      {"icon": "🏘️", "title": "잔금·임대 만기 고객이 많은 사무소", "desc": "잔금 3일 전·만기 60일 전처럼 정한 날 아침 알림으로 연락 시점을 놓치지 않습니다.", "points": ["아침 8시 알림", "만기 미리 챙기기"]}
    ]
  }$j$::jsonb,
  updated_at = now()
where slug = 'realty-client-desk';

insert into public.grade_program_access (grade_id, program_id, can_access)
select g.id, p.id, true from public.member_grades g, public.programs p
where g.name = 'VIP(드림AI팀)' and p.slug = 'realty-client-desk'
on conflict (grade_id, program_id) do update set can_access = true;

select slug, badges, version, left(short_desc, 30) short_desc, (detail_sections->'features'->0->>'title') f1,
  (select string_agg(g.name, ',') from grade_program_access gpa join member_grades g on g.id = gpa.grade_id where gpa.program_id = programs.id) grades
from public.programs where slug = 'realty-client-desk';
