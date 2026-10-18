'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { login } from './actions'

const MAIN_SITE_URL = process.env.NEXT_PUBLIC_MAIN_SITE_URL ?? 'https://buylife.xyz'

export default function AuthForm() {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? ''
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccessMsg(null)

    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await login(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="w-full max-w-[440px] px-4">
      {/* 티스토리(원문)생성 자동화 로고 영역 */}
      <div className="flex flex-col items-center mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 mb-2 no-underline">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 text-white font-black text-xl shadow-xs">
            T
          </div>
          <span className="text-2xl font-extrabold tracking-tight text-slate-900 font-sans">
            티스토리 자동화
          </span>
        </Link>
        <p className="text-xs sm:text-sm font-medium text-slate-500">
          AIMaster 계정(이메일·비밀번호)으로 로그인하세요.
        </p>
      </div>

      {/* 카드 레이아웃 */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] p-6 sm:p-8">
        {/* 상단 탭 버튼 */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              setError(null)
              setSuccessMsg(null)
            }}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              mode === 'login'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup')
              setError(null)
              setSuccessMsg(null)
            }}
            className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              mode === 'signup'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            회원가입
          </button>
        </div>

        {/* 안내 메시지 표시 */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-600 font-medium text-center">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-xs text-emerald-600 font-medium text-center">
            {successMsg}
          </div>
        )}

        {/* 회원가입은 AIMaster에서만 받는다 */}
        {mode === 'signup' ? (
          <div className="space-y-4 text-center">
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              이 프로그램은 AIMaster 계정과 구독 권한을 그대로 사용합니다.
              <br />
              AIMaster에서 회원가입 후 이 프로그램을 구독하면 즉시 이용할 수 있습니다.
            </p>
            <a
              href={`${MAIN_SITE_URL}/register`}
              className="block w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs sm:text-sm transition-all shadow-xs"
            >
              AIMaster 회원가입 하러가기 →
            </a>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <input type="hidden" name="redirect" value={redirectTo} />
            {/* 이메일 주소 입력 */}
            <div>
              <label htmlFor="email" className="block text-xs font-bold text-slate-700 mb-1.5">
                이메일 주소
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25H4.5A2.25 2.25 0 0 1 2.25 17.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5H4.5a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                    />
                  </svg>
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full text-xs sm:text-sm py-2.5 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-sans text-slate-800 placeholder-slate-400"
                  placeholder="name@example.com"
                />
              </div>
            </div>

            {/* 비밀번호 입력 */}
            <div>
              <div className="flex justify-between items-center mb-1.5 font-sans">
                <label htmlFor="password" className="text-xs font-bold text-slate-700">
                  비밀번호
                </label>
                {mode === 'login' && (
                  <a
                    href="#forgot-password"
                    onClick={(e) => {
                      e.preventDefault()
                      setError('비밀번호 재설정은 AIMaster 메인 사이트에서 가능합니다.')
                    }}
                    className="text-[11px] text-orange-600 font-bold hover:underline"
                  >
                    비밀번호 찾기?
                  </a>
                )}
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                    className="w-4 h-4"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
                    />
                  </svg>
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full text-xs sm:text-sm py-2.5 pl-10 pr-4 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 transition-all font-sans text-slate-800 placeholder-slate-400"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-2.5 sm:py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-1.5 focus:outline-none shadow-xs active:scale-95 ${
                isPending ? 'opacity-80 cursor-not-allowed' : ''
              }`}
            >
              {isPending ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
              ) : (
                <>로그인 →</>
              )}
            </button>
          </form>
        )}

        {/* 이용약관 및 푸터 */}
        <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-400 font-sans">
          계속 진행함으로써 귀하는 당사의{' '}
          <a href="#terms" className="text-slate-600 hover:underline font-semibold">
            이용약관
          </a>{' '}
          및{' '}
          <Link href="/privacy" className="text-slate-600 hover:underline font-semibold">
            개인정보 처리방침
          </Link>
          에 동의하게 됩니다.
        </p>
      </div>
    </div>
  )
}
