import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { KeyRound, Download, ListChecks } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { checkProgramAccess } from "@/lib/access/checkProgramAccess";
import GlassCard from "@/components/ui/GlassCard";
import GoldGradientText from "@/components/ui/GoldGradientText";
import GoldButton from "@/components/ui/GoldButton";
import TokenManager from "./TokenManager";
import { GuideLinkButton } from "./GuideLinkButton";

// 공개 판매 시작(programs.is_active=true)에 맞춰 로그인-only 체크를
// checkProgramAccess()로 교체함(CLAUDE.md 멀티테넌시 원칙 1번, "로그인 ≠ 이용 권한").
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export const metadata = { title: "네이버 블로그 자동화(App) - 기기 연동" };

// 2026-09-21: 크롬 확장(웹버전)은 완전히 별도 유료 프로그램(naver-blog-auto-poster-web,
// app/(dashboard)/naver-blog-auto-poster-web/page.tsx)으로 분리 등록됨 — 이 페이지는
// 데스크톱 앱(PC 앱) 전용이다. 로직/유지보수가 서로 달라 앞으로도 각자 독립적으로
// 발전시킨다(사용자 명시적 결정).
const PROGRAM_SLUG = "naver-blog-auto-poster";
const RELEASE_BASE =
  "https://github.com/BUYLIFEMALL/aimaster/releases/download/naver-blog-auto-poster-v0.1.0";
const DESKTOP_DOWNLOAD_URL = `${RELEASE_BASE}/AIMaster-Naver-Blog-Auto-Poster-0.1.0.exe`;

// buylife.xyz의 공개 매뉴얼 게시판(platform_guides)에 이미 등록된 게시글 id를 재사용한다
// (CLAUDE.md "API키등록·플랫폼연동 페이지 표준" — 새 매뉴얼을 만들지 않고 기존 것을 재사용).
const OPENAI_GUIDE_ID = "1c5c24e2-15d4-49b8-b907-0ac6843dee3a";
const GEMINI_GUIDE_ID = "f442cd37-f1e0-42a7-a3de-f9a9acf47cc4";

export default async function NaverBlogAutoPosterPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    const currentPath = (await headers()).get("x-pathname") ?? "/naver-blog-auto-poster";
    redirect(`/login?redirect=${encodeURIComponent(currentPath)}`);
  }

  const access = await checkProgramAccess(supabase, user.id, PROGRAM_SLUG);
  if (!access.allowed) {
    redirect(`/programs/${PROGRAM_SLUG}`);
  }

  const { data: tokens } = await supabase
    .from("personal_access_tokens")
    .select("id, label, created_at, last_used_at, revoked_at")
    .eq("user_id", user.id)
    .eq("program_slug", PROGRAM_SLUG)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          <GoldGradientText>네이버 블로그 자동화(App) - 기기 연동</GoldGradientText>
        </h1>
        <p className="text-subtext mt-1">
          데스크톱 앱에서 이 계정으로 로그인된 것처럼 동작하게 하려면, 여기서 토큰을
          발급받아 앱의 &quot;AIMaster 계정 연동&quot; 화면에 붙여넣으세요.
          <br />
          별도 설치 없이 브라우저에서 바로 쓰는 버전은{" "}
          <a href="/naver-blog-auto-poster-web" className="text-gold underline">
            네이버 블로그 자동화(Web)
          </a>{" "}
          페이지에서 별도로 이용하실 수 있습니다.
        </p>
      </div>

      <div className="max-w-2xl space-y-6">
        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Download size={18} className="text-blue-400" />
            </div>
            <h2 className="text-lg font-bold text-white">데스크톱 앱 다운로드</h2>
          </div>
          <p className="text-xs text-subtext mb-4">
            Windows용 실행 파일입니다. 설치 없이 바로 실행되는 포터블 프로그램이니, 다운로드
            폴더에서 그대로 더블클릭해서 실행하세요.
          </p>
          <a href={DESKTOP_DOWNLOAD_URL}>
            <GoldButton type="button">실행 파일 다운로드 (.exe)</GoldButton>
          </a>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <ListChecks size={18} className="text-purple-400" />
            </div>
            <h2 className="text-lg font-bold text-white">사용 방법</h2>
          </div>
          <ol className="space-y-3 text-sm text-subtext list-decimal list-inside">
            <li>
              <span className="text-white">본인 API 키 준비</span> — 아래 &quot;📖 연동
              매뉴얼&quot;을 참고해서 OpenAI API 키(필수)를 발급받고, 이미지도 자동으로
              만들고 싶으면 Gemini API 키도 발급받아{" "}
              <a href="/api-settings" className="text-gold underline">
                API 설정
              </a>{" "}
              페이지에 등록하세요.
            </li>
            <li>
              <span className="text-white">위 실행 파일 다운로드</span> — Windows용 포터블
              exe입니다. 설치 과정 없이 다운로드 폴더에서 바로 실행하세요.
            </li>
            <li>
              <span className="text-white">실행</span> — 다운로드한 exe 파일을 더블클릭해서
              실행하세요.
            </li>
            <li>
              <span className="text-white">계정 연동</span> — 아래 &quot;기기 연동 토큰&quot;에서
              토큰을 발급받아, 실행한 앱의 &quot;AIMaster 계정 연동&quot; 화면에
              붙여넣으세요.
            </li>
            <li>
              <span className="text-white">네이버 로그인</span> — &quot;네이버 세션 확인&quot;을
              누르면 브라우저 창이 뜹니다. 아이디/비밀번호는 이 프로그램에 입력하지 않고, 그
              창에서 본인이 직접 로그인하세요.
            </li>
            <li>
              <span className="text-white">네이버 블로그 글쓰기 화면 열기</span> — 내 블로그 →
              글쓰기로 들어가세요.
            </li>
            <li>
              <span className="text-white">AI로 초안 생성</span> — 주제를 입력하고 버튼을
              누르면 제목/본문(선택 시 이미지까지)이 자동으로 만들어집니다. 마음에 안 드는
              부분은 자유롭게 직접 수정하세요.
            </li>
            <li>
              <span className="text-white">1단계 — 자동 입력</span> — 버튼을 누르면 제목/본문이
              사람처럼 화면에 채워집니다.
            </li>
            <li>
              <span className="text-white">발행 버튼 직접 클릭</span> — 브라우저의 &quot;발행&quot;
              버튼은 항상 본인이 직접 눌러서 설정창을 엽니다(자동으로 눌리지 않습니다).
            </li>
            <li>
              <span className="text-white">2단계 — 태그/카테고리 입력</span> — 설정창이 열린
              상태에서 버튼을 누르면 태그와 카테고리가 자동으로 채워집니다.
            </li>
            <li>
              <span className="text-white">최종 확인 후 발행</span> — 내용을 마지막으로 확인하고
              설정창 안의 실제 발행 버튼을 본인이 직접 클릭하세요.
            </li>
          </ol>
        </GlassCard>

        <GlassCard>
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
              <KeyRound size={18} className="text-gold" />
            </div>
            <h2 className="text-lg font-bold text-white">기기 연동 토큰</h2>
          </div>
          <p className="text-xs text-subtext mb-4">
            토큰은 발급 시 딱 한 번만 화면에 표시됩니다 — 다시 볼 수 없으니 그 자리에서
            바로 복사해서 앱에 붙여넣으세요.
          </p>
          <TokenManager programSlug={PROGRAM_SLUG} initialTokens={tokens ?? []} />
        </GlassCard>

        <GlassCard>
          <h2 className="text-sm font-bold text-white mb-1">📖 연동 매뉴얼</h2>
          <p className="text-xs text-subtext mb-4">
            이 프로그램이 실제로 쓰는 API 발급 방법입니다. 클릭하면 작은 팝업창으로 열려서
            설정 화면 옆에 두고 그대로 따라 할 수 있습니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <GuideLinkButton guideId={OPENAI_GUIDE_ID} label="OpenAI API 키 발급받기 (필수)" />
            <GuideLinkButton guideId={GEMINI_GUIDE_ID} label="Google Gemini API 키 발급받기 (이미지 생성 시)" />
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
