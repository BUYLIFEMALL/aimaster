export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function SettingsPage() {
  return <><div className="page-heading"><p className="eyebrow">내 계정 연결</p><h1>API키등록·플랫폼연동</h1><p>기본 문서 편집과 원문 저장에는 AI API 키가 필요하지 않습니다.</p></div><div className="card stack"><h2>Google Drive 연결 준비</h2><p>Drive 연결은 4단계에서 추가합니다. 회원이 본인 Google Cloud 프로젝트에 OAuth 앱을 만들고 본인 계정을 연결하도록 구현합니다.</p><p className="muted">현재는 이 기기에서만 문서를 보관합니다. Google 계정에 업로드되거나 다른 기기와 동기화되지 않습니다.</p><div className="notice"><strong>📖 연동 매뉴얼</strong><p>준비 방법과 현재 제공되는 기능을 확인하세요.</p><a href="/guide" className="button">사용 매뉴얼 열기</a></div></div></>;
}
