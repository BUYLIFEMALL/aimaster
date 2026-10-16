import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  const text = fs.readFileSync(path, "utf8");
  const env = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    env[trimmed.slice(0, idx)] = trimmed.slice(idx + 1).replace(/^["']|["']$/g, "");
  }
  return env;
}

const env = loadEnv("D:/Antigravity/AIMaster/.env.local");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, (env.SUPABASE_SECRET_KEY?.trim() || env.SUPABASE_SERVICE_ROLE_KEY?.trim()));

const SHORT_DESC = "웹사이트 URL 입력 한 번으로 실시간 HTML 파싱, 7대 핵심 데이터 자동 분류, 시각적 섹터 선택 및 Gemini AI 스마트 리스트 구조화 추출까지 지원하는 지능형 웹 데이터 스크래핑 솔루션";

const DESCRIPTION = `<p><strong>Whbsite Scraper</strong>는 복잡한 크롤링 코딩이나 셀렉터 설정 없이, 웹사이트 URL 입력만으로 웹페이지의 모든 데이터를 실시간 파싱하고 구조화하는 차세대 지능형 웹 데이터 수집 플랫폼입니다.</p>

<h3>주요 핵심 기능</h3>
<ul>
  <li><strong>원클릭 실시간 웹 크롤링:</strong> 대상 웹사이트의 HTML을 안전한 프록시 파이프라인을 통해 실시간으로 수집하고 인코딩 오류 없이 완벽 파싱합니다.</li>
  <li><strong>7대 핵심 데이터 자동 분류:</strong> 페이지 타이틀, 시맨틱 헤딩(H1~H3), 본문 텍스트, 데이터 테이블(표), 하이퍼링크 목록, 이미지 갤러리, 사이트 메타데이터를 탭별로 즉시 확인합니다.</li>
  <li><strong>시각적 섹터 선택기 (Visual Sector Picker):</strong> 실제 웹페이지 화면을 보면서 추출하고 싶은 영역을 마우스로 직접 클릭하여 텍스트와 HTML을 정밀하게 타겟 캡처합니다.</li>
  <li><strong>Gemini AI 스마트 리스트 추출:</strong> 군더더기 태그를 정제한 클린 HTML을 Gemini AI 모델에 전달하여 블로그 글 목록, 상품 리스트, 게시판 목록 등의 반복 구조를 순번·제목·링크·썸네일 형태의 정형 데이터로 자동 변환합니다.</li>
  <li><strong>다양한 포맷 내보내기:</strong> 추출한 표 및 리스트 데이터를 CSV 파일로 즉시 다운로드하거나, 수집된 고화질 이미지를 원클릭으로 일괄 ZIP 압축 다운로드할 수 있습니다.</li>
</ul>

<h3>안전하고 독립적인 사용 환경</h3>
<p>모든 AI 구조화 분석은 회원이 직접 등록한 <strong>본인의 Google Gemini API 키</strong>를 사용하여 브라우저에서 안전하게 처리되며, 서버나 타인과 공유되지 않는 독립적이고 안전한 환경을 보장합니다.</p>`;

async function main() {
  console.log("Updating Whbsite Scraper (slug: whbsite-scraper) descriptions & version to v1.05 in Supabase...");

  const { data, error } = await supabase
    .from("programs")
    .update({
      short_desc: SHORT_DESC,
      description: DESCRIPTION,
      version: "v1.05",
      updated_at: new Date().toISOString(),
    })
    .eq("id", "45e4c01b-cfb0-4cf1-99db-27e49ea754c3")
    .select("id, slug, name, app_url, version, short_desc")
    .single();

  if (error) {
    console.error("Update failed:", error.message);
    process.exit(1);
  }

  console.log("Update Success!");
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
