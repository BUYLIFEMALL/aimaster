import { SettingsView } from "@/components/views/SettingsView";
import { Hero } from "@/components/ui/Hero";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() { 
  return (
    <>
      <Hero 
        eyebrow="INTEGRATION & SECURITY" 
        title="🔑 유튜브 공식 채널 연동 & AI API 키 보안 관리" 
        desc="유튜브 공식 채널 OAuth 연동으로 쇼츠 즉시 발행 권한을 관리하며, Claude/OpenAI/Gemini API 키를 AES-256 GCM으로 안전하게 격리 보관합니다." 
        emoji="🔐" 
        meta={["🛡️ 회원 본인 키만 사용", "✅ 연결 확인 요금 0원", "⚡ 유튜브 채널 즉시 연동"]} 
      />
      <SettingsView />
    </>
  ); 
}
