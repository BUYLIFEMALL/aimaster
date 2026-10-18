import InfoPage from '@/app/_components/info-page'
import Link from 'next/link'

export default function DocsPage() {
  return (
    <InfoPage title="공식 매뉴얼 및 안내">
      <div className="space-y-4">
        <p className="text-slate-600">
          티스토리(원문)생성 자동화의 상세한 5단계 파이프라인 가이드와 트러블슈팅 FAQ는 공식 사용 매뉴얼 페이지에서 확인하실 수 있습니다.
        </p>
        <div className="pt-2">
          <Link
            href="/guide"
            className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-orange-600 transition-colors"
          >
            📖 연동 & 사용 매뉴얼 바로가기 →
          </Link>
        </div>
      </div>
    </InfoPage>
  )
}
