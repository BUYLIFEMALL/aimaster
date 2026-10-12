import { signInAction } from "@/lib/actions/auth";
import { LoginForm } from "@/components/LoginForm";
import { Heart } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default function LoginPage() {
  return (
    <main className="login-page">
      <div className="card login-card text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-600 to-rose-400 text-white shadow-md shadow-rose-100">
          <Heart className="h-6 w-6 text-rose-100 fill-rose-200/40" />
        </div>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          감성 글귀 이미지
        </h1>
        <p className="text-sm text-slate-500 mt-1 mb-6">
          AIMaster 계정으로 로그인하여 나만의 감성 카드를 제작하세요
        </p>
        <LoginForm action={signInAction} />
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col gap-2 text-xs">
          <a
            href="https://www.buylife.xyz/register"
            className="text-rose-600 hover:text-rose-700 font-semibold"
          >
            AIMaster 회원가입 ↗
          </a>
          <a
            href="https://www.buylife.xyz/programs"
            className="text-slate-400 hover:text-slate-600"
          >
            ← 다른 프로그램 보기
          </a>
        </div>
      </div>
    </main>
  );
}
