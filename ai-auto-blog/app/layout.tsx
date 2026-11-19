import type { Metadata } from 'next'
import localFont from 'next/font/local'
import Script from 'next/script'
import './globals.css'
import BlogShell from './_components/BlogShell'

const sans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
})

import { APP_TITLE, IS_STANDALONE, brandTitle } from '@/lib/deployment'

export const metadata: Metadata = {
  title: IS_STANDALONE ? brandTitle(APP_TITLE) : APP_TITLE,
  description: '주제와 참고링크만 제시하면 검색엔진에 최적화된 고품질 기술 블로그 글을 자동으로 생성해 주는 AI 개발자 플랫폼',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={`${sans.variable} ${sans.className}`}>
        <BlogShell>{children}</BlogShell>
        {/* 저장공간 위젯(메인 사이트 회원 저장 용량) — 수강생 독립 사이트에는 넣지 않음 */}
        {!IS_STANDALONE && <Script src="https://www.buylife.xyz/storage-widget.js" strategy="afterInteractive" />}
      </body>
    </html>
  )
}
