import Link from "next/link";
import { signOutAction } from "@/lib/actions/auth";

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? "https://buylife.xyz";

export function AccountBar({ email }: { email: string }) {
  return (
    <div className="flex items-center justify-end gap-3 mb-4 text-sm text-gray-500">
      <a href={`${MAIN_SITE_URL}/programs`} className="font-medium text-gray-600 hover:text-gray-900">
        ← 다른 프로그램 보기
      </a>
      <span className="truncate max-w-[200px]">{email}</span>
      <Link href="/settings" className="font-medium text-gray-600 hover:text-gray-900">
        API 키 설정
      </Link>
      <form action={signOutAction}>
        <button type="submit" className="font-medium text-gray-600 hover:text-gray-900">
          로그아웃
        </button>
      </form>
    </div>
  );
}
