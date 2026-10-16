import { SettingsView } from "@/components/views/SettingsView";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() { return <><div className="page-heading"><p className="eyebrow">PERSONAL CONNECTION</p><h1>API키등록·플랫폼연동</h1><p>본인 텍스트 AI(Gemini·OpenAI·Claude 중 하나 이상) 키를 등록합니다.</p></div><SettingsView /></>; }
