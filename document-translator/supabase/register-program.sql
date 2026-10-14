-- Catalog metadata proposal. Execute only with the release, after confirmed hosting.
-- No member grants or existing pricing rows are overwritten.
begin;
insert into public.programs (category_id,name,slug,short_desc,description,required_grade_id,app_url,badges,version,is_active)
select c.id,'AI 문서번역 자동화','document-translator',
  'TXT·PDF·Word 문서를 10개 언어로 번역하고 문맥·전문 용어·문체를 검토합니다.',
  $$## 문서를 번역하고 직접 검토하세요
회원님의 Gemini 키로 문서를 번역하고 원문과 비교하는 작업 공간입니다.

### 지원 기능
- 직접 입력과 TXT·텍스트 PDF·DOCX 가져오기
- 한국어·영어·일본어·중국어 간체·스페인어·프랑스어·독일어·러시아어·베트남어·인도네시아어
- 문맥·전문 용어·문체의 AI 참고 평가, 문단별 수정과 수정본 재검수
- 현재 수정본 역번역, 숫자·URL 대조 제안, 개인 용어집
- TXT·Markdown·서식 DOCX 다운로드, 용어집 CSV·TXT, 프로젝트 JSON 백업
- 저장을 선택한 회원별 프로젝트 보관함

### 이용 전 확인
AIMaster 회원 계정·프로그램 이용 권한·본인 Gemini API 키가 필요합니다. AI 사용료는 회원님 본인 계정에 적용됩니다. 파일당5MB·텍스트 PDF50페이지·원문20,000자까지 지원합니다. 스캔 PDF·HWP·PPTX·XLSX·완전한 원본 배치 재현은 지원하지 않습니다. AI 평가와 역번역은 정확성을 보증하지 않으므로 내용을 직접 검토해주세요.$$,
  g.id,'https://document-translator.buylife.xyz',array['new'],'v1.01',false
from public.categories c cross join public.member_grades g
where c.slug='tools' and g.slug='basic'
on conflict (slug) do nothing;

insert into public.pricing_plans(program_id,name,billing_type,price,original_price,is_active,sort_order)
select p.id,v.name,v.billing_type,v.price,v.price,true,v.sort_order
from public.programs p cross join (values
 ('1개월','monthly',10000,0),('2개월','bimonthly',20000,1),('3개월','quarterly',30000,2)
) as v(name,billing_type,price,sort_order)
where p.slug='document-translator'
and not exists(select 1 from public.pricing_plans q where q.program_id=p.id and q.billing_type=v.billing_type);
-- Keep inactive until hosting, thumbnail, shared SSO and member verification succeed.
-- VIP access uses existing grade_program_access trigger when the release is ready.
commit;
