-- Catalog copy and public artwork only; schema, permissions and v1.02 app/extension are unchanged.
-- See docs/catalog-before-20261016.json for the pre-update public metadata.
begin;
update public.programs
set short_desc = $short$주제·기존 원고로 글과 이미지를 만들고 수정 이력·발행 전 점검·네이버 입력까지 돕는 제작 도구$short$,
    description = $description$<p>📝 <strong>주제나 기존 원고로 글·이미지를 만들고 수정 이력을 남겨 점검한 뒤 네이버 편집기로 옮기는 콘텐츠 제작 도구입니다.</strong></p><p>💡 주제·키워드로 제목 10개를 추천받고 5가지 작성 방식으로 새 글을 씁니다. 기존 원고나 TXT·MD·HTML 파일은 원문을 보관하며 새 수정본으로 다듬습니다.</p><p>🔎 제목·문단·반복 단어·FAQ·태그·이미지·출처를 점검하고 AI 의견을 받아 고칩니다. 이전 수정본과 비교하며 사실·경험 표현은 직접 확인합니다.</p><p>🎨 본문 이미지·제품 사진 합성·영상용 첫·끝 장면 이미지를 만들고, 설명·삽입 위치를 조절합니다. 장면 이미지는 영상 파일이 아닙니다.</p><p>📦 글·이미지를 HTML·Markdown·ZIP으로 받거나 전용 확장으로 빈 네이버 편집기에 입력합니다. 작업은 계정별로 30일 보관합니다.</p><p>🔑 글에는 회원 본인의 Gemini 또는 OpenAI API 키, 이미지는 Gemini 키, 네이버 입력은 본인 계정이 필요합니다. 점검은 네이버 공식 점수가 아니며 최종 발행은 직접 합니다.</p>$description$,
    detail_sections = $sections${"features":[{"icon":"🗂️","title":"원문·수정 이력 보존","desc":"기존 글·TXT·MD·HTML 원문과 수정본을 나누어 보관하고, 이전 내용과 비교해 직접 다듬습니다."},{"icon":"🔎","title":"발행 전 점검·AI 검토","desc":"문단·반복 단어·FAQ·태그·출처를 점검하고 AI 의견을 받습니다. 사실과 실제 경험은 회원이 확인합니다."},{"icon":"🎨","title":"글에 맞춘 이미지 준비","desc":"본문 이미지·제품 사진 합성·영상용 첫째와 마지막 장면 이미지를 만들고, 설명과 삽입 위치를 고릅니다."},{"icon":"📦","title":"파일 저장·네이버 입력","desc":"이미지 포함 ZIP·HTML·Markdown으로 받거나 전용 확장으로 빈 네이버 편집기에 입력한 뒤 직접 발행합니다."}],"steps":[{"title":"키 등록·글감 선택","desc":"설정에서 본인 API 키를 등록한 뒤 주제로 제목을 고르거나 기존 원고·파일을 넣습니다."},{"title":"원고 작성·수정","desc":"5가지 방식으로 새 글을 쓰거나 기존 글을 다듬고, 수정본을 비교해 저장합니다."},{"title":"점검·이미지 준비","desc":"점검과 AI 의견으로 글을 고친 뒤 이미지를 생성·업로드하고 위치를 정합니다."},{"title":"내보내기·직접 발행","desc":"파일로 받거나 전용 확장으로 빈 네이버 편집기에 입력하고, 확인 후 직접 발행합니다."}]}$sections$::jsonb,
    thumbnail_url = $thumbnail$https://esgxyikcnnvmlhygjkth.supabase.co/storage/v1/object/public/program-images/catalog/blog-content-maker-thumbnail.jpg?v=1792086035048$thumbnail$
where id = '5299d74c-ea40-4452-a9cc-0fd96ced44d0'
  and slug = 'blog-content-maker'
  and version = 'v1.02'
  and thumbnail_url = $old_thumbnail$https://blog-content-maker.buylife.xyz/brand.png$old_thumbnail$
  and description = $old_description$<p>📝 <strong>새 주제든 이미 쓴 원고든, 블로그 글과 이미지를 완성하고 발행 전 점검까지 마친 뒤 네이버로 옮기는 콘텐츠 제작 도구입니다.</strong></p><p>💡 주제와 키워드로 제목 10개를 추천받고 정보 정리형·검색 의도형·질문 답변형 등 5가지 방식으로 원고를 쓰며, 기존 글이나 문서 파일은 의미와 사실을 보존해 새 수정본으로 다듬습니다.</p><p>🔎 제목·문단·반복 단어·FAQ·태그·이미지·출처를 점검하고 AI 검토 의견을 받아, 원문과 수정 이력을 남긴 채 직접 고칩니다.</p><p>🎨 본문 이미지와 제품 합성, 영상용 첫·끝 장면 이미지를 준비하고, ALT 설명과 위치를 조절해 파일로 받거나 전용 크롬 확장으로 빈 네이버 편집기에 입력합니다.</p><p>🔑 회원 본인의 Gemini 또는 OpenAI 키를 쓰고, 이미지는 본인 Gemini 키가 필요합니다. 점검 결과는 네이버 공식 점수가 아니며 최종 발행은 회원이 직접 합니다.</p>$old_description$
returning id, slug, version, thumbnail_url, jsonb_array_length(detail_sections->'features') as features_count, jsonb_array_length(detail_sections->'steps') as steps_count;
commit;
