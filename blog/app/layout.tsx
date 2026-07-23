import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'DevFlow - AI 기반 자동 블로그 및 개발자 미디어',
  description: '주제와 참고링크만 제시하면 검색엔진에 최적화된 고품질 기술 블로그 글을 자동으로 생성해 주는 AI 개발자 플랫폼',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
