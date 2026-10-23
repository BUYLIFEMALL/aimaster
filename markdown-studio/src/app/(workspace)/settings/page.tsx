import { DriveSettings } from "@/components/workspace/DriveSettings";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function SettingsPage() {
  return <><div className="page-heading"><p className="eyebrow">내 계정 연결</p><h1>API키등록·플랫폼연동</h1><p>문서 편집·가져오기·내보내기·백업에는 AI API 키가 필요하지 않습니다. Google Drive는 내 Google 앱과 내 계정으로 연결합니다.</p></div><DriveSettings/></>;
}
