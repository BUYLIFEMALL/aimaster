-- 0009_fix_typo_website_scraper_v107.sql
-- 프로그램명 오타 수정: Whbsite Scraper -> Website Scraper 및 v1.07 판올림

UPDATE programs
SET 
  slug = 'website-scraper',
  name = 'Website Scraper',
  app_url = 'https://website-scraper.buylife.xyz',
  short_desc = '웹사이트 URL 입력으로 본문·표·이미지를 자동 수집하고, AI로 원하는 목록을 구조화하여 추출하는 지능형 웹 스크래퍼',
  description = '<p><strong>Website Scraper</strong>는 복잡한 크롤링 설정이나 코딩 없이, 웹사이트 URL 입력만으로 웹페이지의 모든 데이터를 실시간으로 수집하고 구조화하는 지능형 웹 데이터 스크래핑 플랫폼입니다.</p>

<h3>주요 핵심 기능</h3>
<ul>
  <li><strong>원클릭 실시간 웹 크롤링:</strong> 대상 웹사이트의 HTML을 실시간으로 수집하고 인코딩 오류 없이 완벽하게 파싱합니다.</li>
  <li><strong>7대 핵심 데이터 자동 분류:</strong> 페이지 타이틀, 시맨틱 헤딩(H1~H3), 본문 텍스트, 데이터 테이블(표), 하이퍼링크 목록, 이미지 갤러리, 메타데이터를 탭별로 즉시 확인합니다.</li>
  <li><strong>시각적 섹터 선택기:</strong> 실제 웹페이지 화면을 보면서 추출하고 싶은 영역을 마우스로 직접 클릭하여 텍스트와 HTML을 정밀하게 타겟 캡처합니다.</li>
  <li><strong>Gemini AI 스마트 리스트 추출:</strong> 군더더기 태그를 정제한 클린 HTML을 Gemini AI에 전달하여 블로그 글 목록, 상품 리스트, 게시판 목록 등의 반복 구조를 순번·제목·링크·썸네일 형태의 정형 데이터로 자동 변환합니다.</li>
  <li><strong>다양한 포맷 내보내기:</strong> 추출한 표 및 리스트 데이터를 CSV 파일로 즉시 다운로드하거나, 수집된 고화질 이미지를 원클릭으로 일괄 ZIP 압축 다운로드할 수 있습니다.</li>
</ul>

<h3>안전하고 독립적인 사용 환경</h3>
<p>모든 AI 구조화 분석은 회원이 직접 등록한 <strong>본인의 Google Gemini API 키</strong>를 사용하여 브라우저에서 안전하게 처리되며, 서버나 타인과 공유되지 않는 독립적이고 안전한 환경을 보장합니다.</p>',
  version = 'v1.07',
  updated_at = NOW()
WHERE id = '45e4c01b-cfb0-4cf1-99db-27e49ea754c3';
