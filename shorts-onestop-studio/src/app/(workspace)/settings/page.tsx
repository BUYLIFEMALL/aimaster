import { SettingsView } from "@/components/views/SettingsView";
import { Hero } from "@/components/ui/Hero";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export default function Page() { return <><Hero eyebrow="PERSONAL CONNECTION" title="🔑 API키등록·플랫폼연동" desc="본인 AI 키(Gemini·OpenAI·Claude 중 하나 이상)와 스톡 키(Pexels·Pixabay, 선택)를 등록하고, 주제·대본에 쓸 AI와 모델을 고릅니다." emoji="🔐" meta={["🛡️ 본인 키만 사용", "✅ 연결 확인은 요금 없음"]} /><SettingsView /></>; }
