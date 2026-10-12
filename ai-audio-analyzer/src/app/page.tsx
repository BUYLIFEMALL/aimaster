import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { checkProgramAccess } from "@/lib/programAccess";
import AudioAnalyzerApp from "@/components/studio/AudioAnalyzerApp";
import { PROGRAM_SLUG, APP_NAME } from "@/lib/version";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const hasAccess = await checkProgramAccess(user.id, PROGRAM_SLUG);
  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <div className="max-w-md bg-white p-8 rounded-2xl shadow-xl border border-slate-200 space-y-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mx-auto text-xl font-bold">
            🔒
          </div>
          <h2 className="text-lg font-bold text-slate-800">프로그램 이용 권한 필요</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            현재 <strong>{APP_NAME}</strong>을(를) 이용할 수 있는 권한이 없습니다.
            관리자 승인 또는 이용권 등록 후 이용하실 수 있습니다.
          </p>
          <div className="pt-2">
            <a
              href="https://aimaster.buylife.xyz"
              className="inline-block px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
            >
              AIMaster 메인으로 돌아가기
            </a>
          </div>
        </div>
      </div>
    );
  }

  return <AudioAnalyzerApp initialUserEmail={user.email} />;
}
