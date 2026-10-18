'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import BlogSidebar from './BlogSidebar'
import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { APP_VERSION } from '@/utils/version'

export default function BlogShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  useEffect(() => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !(
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
      )
    ) {
      return
    }

    createClient()
      .auth.getUser()
      .then(({ data }) => setIsLoggedIn(!!data.user))
  }, [])

  // 라우트 변경 시 모바일 드로어 닫기
  useEffect(() => {
    setIsDrawerOpen(false)
  }, [pathname])

  const isPostsRoute = pathname.startsWith('/posts') || pathname.startsWith('/my-posts')

  const showSidebar =
    pathname === '/' ||
    pathname.startsWith('/write') ||
    pathname.startsWith('/candidates') ||
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/guide') ||
    (isPostsRoute && isLoggedIn)

  // 현재 페이지 타이틀 산출
  const getPageTitle = () => {
    if (pathname === '/dashboard') return '대시보드'
    if (pathname.startsWith('/candidates')) return '1단계: 게시글 주제 수집'
    if (pathname.startsWith('/write')) return '2단계: AI 글쓰기'
    if (pathname === '/' || pathname.startsWith('/my-posts')) return '3단계: 게시글 관리'
    if (pathname.startsWith('/posts')) return '게시글 상세 및 티스토리 전송'
    if (pathname.startsWith('/settings')) return 'API키 & 플랫폼 연동'
    if (pathname.startsWith('/guide')) return '연동 & 사용 매뉴얼'
    return '티스토리 자동화'
  }

  if (showSidebar) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-slate-50 md:flex-row antialiased text-slate-800">
        {/* 모바일 상단 슬림 헤더 (md:hidden) */}
        <header className="sticky top-0 z-40 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-sm md:hidden">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 font-black text-sm text-white shadow-xs">
              T
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-900 leading-tight">티스토리 자동화</span>
              <span className="text-[10px] font-semibold text-orange-600">{getPageTitle()}</span>
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="메뉴 열기"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-xs hover:bg-slate-50 active:scale-95 transition-transform"
          >
            <span className="text-lg leading-none">☰</span>
          </button>
        </header>

        {/* 모바일 슬라이딩 드로어 (Drawer) + 배경 Dim */}
        {isDrawerOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity duration-300"
              onClick={() => setIsDrawerOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out">
              <div className="flex h-14 items-center justify-between border-b border-slate-100 px-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-xs font-bold text-white">
                    T
                  </div>
                  <span className="text-sm font-bold text-slate-900">전체 메뉴</span>
                  <span className="rounded bg-orange-50 px-1 py-0.5 text-[9px] font-bold text-orange-600">
                    {APP_VERSION}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(false)}
                  aria-label="메뉴 닫기"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  ✕
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <BlogSidebar onNavigate={() => setIsDrawerOpen(false)} />
              </div>
            </div>
          </div>
        )}

        {/* 데스크톱 고정 좌측 사이드바 (md:flex) */}
        <div className="hidden md:sticky md:top-0 md:flex md:h-screen md:w-64 md:shrink-0 md:border-r md:border-slate-200 md:bg-white md:shadow-xs">
          <BlogSidebar />
        </div>

        {/* 메인 콘텐츠 영역 (모바일 가로스크롤 넘침 방지) */}
        <main className="min-w-0 flex-1 overflow-x-hidden bg-slate-50">
          {children}
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-slate-50 font-sans text-slate-900 antialiased overflow-x-hidden">
      {children}
    </div>
  )
}
