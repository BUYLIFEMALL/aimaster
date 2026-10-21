-- AI 가사영상 자동화(lyric-video-studio) 프로그램 등록 — 2026-10-21 v1.01 (Claude Code 윈도우)
-- 대상: 운영 DB esgxyikcnnvmlhygjkth. 주인님 결정: 권한 부여 방식(FREE 배지 없음), 카테고리 음악(music-automation과 같은 분류), 최소 등급 일반.
-- 상세 소개 형식: docs/PROGRAM_DESCRIPTION_STANDARD.md (굵은 한 줄 소개 + 기능 단락 + 본인 키·주의 단락)
insert into public.programs(name,slug,short_desc,description,category_id,required_grade_id,is_active,sort_order,app_url,badges,version,detail_sections)
select 'AI 가사영상 자동화','lyric-video-studio',
'음악과 가사만 넣으면 가사가 흐르는 유튜브·쇼츠 영상을 브라우저에서 바로 MP4로 만드는 도구입니다.',
$desc$<p>🎤 <strong>음악 파일과 가사만 있으면 「지금 부르는 줄」이 강조되며 흐르는 가사 영상을 설치 없이 브라우저에서 MP4로 만드는 도구입니다.</strong></p><p>📄 가사는 .srt 자막·.lrc 가사 파일을 그대로 넣거나 붙여넣을 수 있고, 번호가 빠지거나 형식이 조금 다른 자막도 알아서 읽어 냅니다.</p><p>⏱️ 시간이 없는 가사는 노래를 들으며 스페이스바로 줄 시작을 찍는 탭 싱크로 맞추고, 손이 늦는 만큼 자동 보정한 뒤 줄마다 0.1초 단위로 다듬습니다. 맞춘 시간은 .srt 자막 파일로도 받을 수 있습니다.</p><p>🎨 유튜브용 가로 16:9와 쇼츠·릴스용 세로 9:16 프리셋에 현재 줄 강조 7종(노래방 채움·형광펜·밑줄 긋기 등), 한글 서체 6종, 앨범 커버와 소리에 반응하는 스펙트럼을 더해 꾸미고, 미리보기 그대로 1080p 영상을 만듭니다.</p><p>🔒 API 키 없이 쓸 수 있고 음악·커버·완성 영상은 서버로 올라가지 않습니다. 저장한 가사 시간표와 디자인은 30일 뒤 자동 삭제되며, 영상 만들기는 PC의 최신 크롬·엣지에서 가능합니다. 본인이 권리를 가진 곡으로 만들어 주세요.</p>$desc$,
m.category_id, m.required_grade_id, true, (select coalesce(max(sort_order),0)+1 from public.programs),
'https://lyric-video-studio.buylife.xyz', array['new'], 'v1.01',
$json${
 "features":[
  {"icon":"⏱️","title":"스페이스바 탭 싱크","desc":"노래를 들으며 줄 시작을 찍고 손 반응 보정과 0.1초 단위 수정으로 시간을 맞춥니다."},
  {"icon":"📄","title":"너그러운 자막 읽기","desc":"번호 빠짐·공백 차이·윈도우 줄바꿈이 섞인 .srt와 .lrc도 그대로 읽습니다."},
  {"icon":"🎨","title":"가로·세로 프리셋","desc":"유튜브 16:9와 쇼츠 9:16 프리셋에 현재 줄 강조 7종과 한글 서체 6종을 고릅니다."},
  {"icon":"🎬","title":"브라우저에서 MP4 완성","desc":"미리보기와 같은 화면을 서버 없이 내 PC 그래픽 기능으로 1080p 영상으로 만듭니다."}
 ],
 "steps":[
  {"title":"음악·가사 넣기","desc":"음악 파일·커버와 .srt·.lrc 가사를 넣거나 가사를 붙여넣습니다."},
  {"title":"가사 싱크","desc":"노래를 틀고 스페이스바로 줄 시작을 찍은 뒤 줄마다 다듬습니다."},
  {"title":"디자인","desc":"가로·세로 프리셋을 고르고 강조 방식·서체·색을 바꿉니다."},
  {"title":"MP4 내보내기","desc":"1080p 영상을 만들어 미리 보고 내려받습니다."}
 ],
 "audiences":[
  {"icon":"🎵","title":"AI로 곡을 만드는 분","desc":"Suno 등으로 만든 곡에 가사를 입혀 유튜브·쇼츠용 가사 영상으로 바로 바꿉니다.","points":["가사 영상 바로 완성","가로·세로 모두"]},
  {"icon":"🎙️","title":"자작곡·커버곡을 올리는 분","desc":"자막 프로그램 없이 노래를 들으며 탭으로 가사 시간을 맞추고 .srt로도 받습니다.","points":["탭 한 번에 시간 기록","자막 파일 내보내기"]},
  {"icon":"📺","title":"음악 채널 운영자","desc":"채널 분위기에 맞는 프리셋과 노래방 채움 강조로 같은 톤의 가사 영상을 계속 만듭니다.","points":["노래방 채움 강조","작업 저장 후 재사용"]}
 ]
}$json$::jsonb
from public.programs m
where m.slug='music-automation'
  and not exists (select 1 from public.programs where slug='lyric-video-studio');

-- 기본 요금제 3종(1·2·3개월 1만/2만/3만원)
insert into public.pricing_plans(program_id,name,billing_type,price,original_price,is_active,sort_order)
select p.id,v.name,v.billing_type,v.price,v.price,true,v.sort_order
from public.programs p cross join (values('1개월','monthly',10000,0),('2개월','bimonthly',20000,1),('3개월','quarterly',30000,2))v(name,billing_type,price,sort_order)
where p.slug='lyric-video-studio'
  and not exists (select 1 from public.pricing_plans pp where pp.program_id=p.id);

-- VIP(드림AI팀) 등급 자동 부여 체크 — 트리거 grade_program_access_sync가 VIP 회원에게 사용기간을 넣는다. 다른 등급은 주인님이 직접 부여.
insert into public.grade_program_access (grade_id, program_id, can_access)
select g.id, p.id, true from public.member_grades g, public.programs p
where g.name = 'VIP(드림AI팀)' and p.slug = 'lyric-video-studio'
on conflict (grade_id, program_id) do update set can_access = true;

-- 시험 계정(일반 회원 권한) 사용기간: music-automation에 부여된 기간을 그대로 복사
insert into public.user_program_access(user_id,program_id,expires_at)
select a.user_id,p.id,a.expires_at
from public.user_program_access a
join public.programs old on old.id=a.program_id
join auth.users u on u.id=a.user_id
cross join public.programs p
where old.slug='music-automation' and p.slug='lyric-video-studio' and u.email='buylifemall@naver.com'
  and (a.expires_at is null or a.expires_at>now())
on conflict(user_id,program_id) do nothing;
