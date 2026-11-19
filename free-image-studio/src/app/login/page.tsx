import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { signInAction } from "@/lib/actions/auth";
import { APP_NAME } from "@/lib/version";

export const metadata: Metadata = { robots: { index: false, follow: false } };

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://www.buylife.xyz";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ redirect?: string }> }) {
  const { redirect } = await searchParams;
  // 돌아갈 곳은 signInAction이 내부 경로인지 다시 확인한다.
  const action = async (state: { error?: string }, form: FormData) => {
    "use server";
    form.set("redirect", redirect ?? "");
    return signInAction(state, form);
  };
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 text-center text-slate-900">
        <h1 className="text-lg font-bold">🎨 {APP_NAME}</h1>
        <p className="mb-6 mt-1 text-xs text-slate-600">AIMaster 계정으로 로그인해 주세요.</p>
        <LoginForm action={action} />
        <a href={`${MAIN_SITE_URL}/register`} className="mt-5 block text-xs text-slate-500 underline">
          아직 회원이 아니신가요? AIMaster 회원가입
        </a>
      </div>
    </div>
  );
}
