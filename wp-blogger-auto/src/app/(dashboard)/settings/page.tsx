import { requireProgramAccess } from "@/lib/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMemberKey } from "@/lib/memberKeys";
import { DRAFT_MODELS } from "@/lib/draft/models";
import { IMAGE_MODELS } from "@/lib/image/models";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// AI 키·모델 — 키 값은 화면에 보이지 않는다(등록 여부만). 등록·수정은 메인 사이트 한 곳에서(다른 AIMaster 프로그램과 공용).
const KEYS = [
  { provider: "anthropic", label: "Anthropic(Claude) API 키", use: "원고 만들기 · 이미지 장면 기획", get: "https://console.anthropic.com/settings/keys" },
  { provider: "gemini", label: "Gemini API 키", use: "본문·대표 이미지 만들기", get: "https://aistudio.google.com/apikey" },
  { provider: "google_client_id", label: "Google OAuth Client ID", use: "구글 블로그 연결(유튜브 자동화와 같은 키)", get: "https://console.cloud.google.com/apis/credentials" },
  { provider: "google_client_secret", label: "Google OAuth Client Secret", use: "구글 블로그 연결", get: "https://console.cloud.google.com/apis/credentials" },
];

export default async function SettingsPage() {
  const user = await requireProgramAccess();
  const admin = createAdminClient();
  const status = await Promise.all(KEYS.map((k) => getMemberKey(admin, user.id, k.provider).then((v) => !!v)));

  return (
    <div className="space-y-6">
      <div>
        <span className="inline-block rounded-full bg-blue-100 px-3 py-1 text-xs font-extrabold text-blue-700">⚙️ 연료 점검</span>
        <h1 className="mt-2 text-3xl font-black">AI 키·모델</h1>
        <p className="mt-1 text-sm text-[color:var(--muted)]">이 프로그램은 회원님 본인 키로만 동작합니다. 키는 AIMaster 키 등록에서 한 번 넣으면 모든 프로그램이 함께 씁니다.</p>
      </div>

      <div className="lp-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-black">🔑 키 등록 상태</h2>
          <a href="https://www.buylife.xyz/api-settings" target="_blank" rel="noreferrer" className="lp-btn">키 등록·수정하러 가기 ↗</a>
        </div>
        <ul className="mt-3 space-y-2">
          {KEYS.map((k, i) => (
            <li key={k.provider} className="flex flex-wrap items-center gap-3 rounded-xl bg-[color:var(--surface-soft)] px-3 py-2.5 text-sm">
              <span className={`lp-tag ${status[i] ? "lp-tag-ok" : "lp-tag-warn"}`}>{status[i] ? "등록됨" : "없음"}</span>
              <b>{k.label}</b>
              <span className="text-[color:var(--muted)]">{k.use}</span>
              {!status[i] && <a href={k.get} target="_blank" rel="noreferrer" className="ml-auto text-xs font-bold text-[color:var(--wp)] underline">발급받는 곳 ↗</a>}
            </li>
          ))}
        </ul>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="lp-card">
          <h2 className="text-lg font-black">✍️ 원고 AI</h2>
          <p className="mt-1 text-xs text-[color:var(--muted)]">원고 만들기 화면에서 매번 고릅니다. 기본값은 「균형」입니다.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {DRAFT_MODELS.map((m) => <li key={m.id} className="rounded-xl border-2 border-[color:var(--border)] px-3 py-2"><b>{m.label}</b><span className="block text-xs text-[color:var(--muted)]">{m.note}</span></li>)}
          </ul>
        </div>
        <div className="lp-card">
          <h2 className="text-lg font-black">🖼 이미지 AI</h2>
          <p className="mt-1 text-xs text-[color:var(--muted)]">편집 화면의 이미지 칸에서 고릅니다. 장면 기획은 Claude Haiku로 1번(약 1원).</p>
          <ul className="mt-3 space-y-2 text-sm">
            {IMAGE_MODELS.map((m) => <li key={m.id} className="rounded-xl border-2 border-[color:var(--border)] px-3 py-2"><b>{m.label}</b><span className="block text-xs text-[color:var(--muted)]">{m.note}</span></li>)}
          </ul>
        </div>
      </div>
      <p className="text-xs text-[color:var(--muted)]">금액은 2026년 11월 공식 가격 기준 대략값이며, 실제 요금은 각 AI 회사가 회원님 키로 청구합니다.</p>
    </div>
  );
}
