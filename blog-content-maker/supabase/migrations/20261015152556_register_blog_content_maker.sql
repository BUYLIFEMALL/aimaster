-- Registration and ordinary test-account grant copied from its existing entitlement.
insert into public.programs(name,slug,short_desc,description,category_id,required_grade_id,is_active,sort_order,app_url,badges,version,extension_version,extension_download_url,thumbnail_url)
select 'AI 블로그 콘텐츠 제작 자동화','blog-content-maker','글감부터 원고·이미지·SEO 점검까지 블로그 콘텐츠를 한곳에서 완성합니다.',
$desc$<p>📝 <strong>주제나 기존 원고를 바탕으로 제목·본문·이미지와 발행 전 점검을 완성하는 블로그 콘텐츠 제작 도구입니다.</strong></p><p>💡 주제와 키워드를 입력하면 제목 아이디어를 추천하고, 정보 정리형·검색 의도형·질문 답변형 등 다섯 가지 방식으로 원고를 작성합니다. 기존 글을 붙여넣거나 문서 파일을 불러와 의미와 사실을 보존하며 새 수정본으로 다듬을 수 있습니다.</p><p>🔎 제목·문단·반복 단어·FAQ·태그·이미지·출처를 점검하고 AI 검토 의견을 확인합니다. 원문과 수정 이력을 따로 보관하며, 원고를 바꾸면 현재 내용으로 다시 점검할 수 있습니다.</p><p>🎨 본문 이미지와 제품 합성, 영상 제작에 사용할 첫 장면·끝 장면 이미지를 준비합니다. ALT 설명과 위치를 조절하고 원고·이미지를 파일로 내려받거나 전용 Chrome 확장으로 빈 네이버 편집기에 입력할 수 있습니다.</p><p>🔑 회원 본인의 Gemini 또는 OpenAI API 키를 사용하며 이미지 생성에는 본인 Gemini 키가 필요합니다. 점검 결과는 네이버 공식 점수가 아니며, 사실 확인과 네이버 최종 발행은 회원이 직접 진행합니다.</p>$desc$,
p.category_id,p.required_grade_id,true,(select coalesce(max(sort_order),0)+1 from public.programs),
'https://blog-content-maker.buylife.xyz',array['new'],'v1.01','v1.01',
'https://blog-content-maker.buylife.xyz/downloads/blog-content-maker-extension-latest.zip','https://blog-content-maker.buylife.xyz/brand.png'
from public.programs p where p.slug='blog-workroom';
insert into public.pricing_plans(program_id,name,billing_type,price,original_price,is_active,sort_order)
select p.id,v.name,v.billing_type,v.price,v.price,true,v.sort_order
from public.programs p cross join (values('1개월','monthly',10000,0),('2개월','bimonthly',20000,1),('3개월','quarterly',30000,2))v(name,billing_type,price,sort_order)
where p.slug='blog-content-maker';
insert into public.grade_program_access(grade_id,program_id,can_access)
select g.grade_id,p.id,g.can_access from public.grade_program_access g join public.programs old on old.id=g.program_id cross join public.programs p
where old.slug='blog-workroom' and p.slug='blog-content-maker';
insert into public.user_program_access(user_id,program_id,expires_at)
select a.user_id,p.id,a.expires_at from public.user_program_access a join public.programs old on old.id=a.program_id join auth.users u on u.id=a.user_id cross join public.programs p
where old.slug='blog-workroom' and p.slug='blog-content-maker' and u.email='buylifemall@naver.com' and (a.expires_at is null or a.expires_at>now())
on conflict(user_id,program_id) do nothing;
insert into public.platform_guides(category,title,content,sort_order,is_active)
values('LLM AI','AI 블로그 콘텐츠 제작 자동화 · 본인 AI 키와 Chrome 확장 연결',
$guide$<h2>본인 AI 키 등록</h2><p>본인 Google AI Studio 또는 OpenAI 계정에서 API 키를 발급하고, 프로그램의 API키등록·플랫폼연동에서 제공사를 골라 저장합니다. 글 작성 제공사·모델을 선택하고 설정을 저장합니다. 이미지는 본인 Gemini 키가 필요합니다. 키 저장만으로 유료 진단을 실행하지 않습니다.</p><h2>Chrome 확장 연결</h2><p>프로그램 설정에서 최신 ZIP을 받아 압축을 풉니다. chrome://extensions의 개발자 모드를 켜고 압축해제된 확장 프로그램을 불러옵니다. 설정에서 본인 연결 코드를 발급해 확장에 붙여넣고, 원고와 빈 네이버 글쓰기 탭을 선택합니다. 입력 후 전체 내용을 확인하고 최종 발행은 직접 진행합니다.</p><h2>업데이트·보안</h2><p>확장은 ZIP 재다운로드→기존 폴더 덮어쓰기→확장 새로고침 순서로 갱신합니다. 연결 코드는 7일간 유효하며 웹 설정에서 모두 해제할 수 있습니다. 키·비밀번호·연결 코드를 다른 사람에게 전달하지 마세요.</p>$guide$,100,true);
