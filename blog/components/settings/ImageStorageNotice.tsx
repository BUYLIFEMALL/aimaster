import { RETENTION_DAYS, retentionDeleteAt } from '@/blog/utils/imageRetention'

// "글·이미지 보관 기간 안내" 박스 — 설정 화면(전체), AI 글쓰기·게시글 관리 화면(compact)에 함께 쓴다.
// 2026-10-01: 이미지를 AIMaster 저장소(Supabase Storage)에 자동 저장하고, 데이터 누적을 막기 위해 글(제목·본문)과
// 이미지를 만든 날부터 30일만 보관하도록 정했다(주인님 지시). 값은 utils/imageRetention.ts 한 곳에서 바꾼다.
const formatDate = (d: Date) => `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`

export function ImageStorageNotice({ compact = false }: { compact?: boolean }) {
  // 정책 시작 전부터 있던 글이 지워지기 시작하는 날(시작일 + 30일)
  const firstDeletion = formatDate(retentionDeleteAt('2000-01-01T00:00:00Z'))

  const items = [
    `이 프로그램에서 만든 콘텐츠 일체(작성한 글의 제목·본문, 글에 들어간 이미지, 글감 수집 결과)는 하나하나 만든 날부터 ${RETENTION_DAYS}일 동안만 보관되고, 그 뒤에는 자동으로 삭제됩니다. 삭제된 콘텐츠는 되살릴 수 없습니다.`,
    `이미 만들어 둔 콘텐츠는 ${firstDeletion}부터 삭제되기 시작합니다. 게시글 관리 화면에서 글마다 삭제까지 남은 날을 확인할 수 있습니다.`,
    '필요한 글은 기간 안에 네이버 블로그·티스토리 등 본인 블로그로 옮겨 주세요. 이때 이미지는 꼭 내려받아 그 블로그에 직접 올려 주세요. "본문 복사"로 붙여넣은 이미지도 같은 저장소 주소를 쓰기 때문에 보관 기간이 지나면 보이지 않습니다.',
    'AI가 만든 이미지와 편집기에서 첨부한 이미지는 AIMaster 저장소에 자동으로 저장됩니다. 따로 이미지 저장소(Cloudinary 등)를 연결하지 않아도 됩니다.',
  ]

  if (compact) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
        <p className="font-bold">🗓️ 콘텐츠 보관 기간 {RETENTION_DAYS}일</p>
        <p>
          글·이미지·글감 수집 결과는 하나하나 만든 날부터 {RETENTION_DAYS}일 뒤 자동으로 삭제됩니다. 필요한 글은 기간 안에 본인 블로그로 옮기고,
          이미지는 내려받아 직접 올려 주세요.
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-amber-900">🗓️ 콘텐츠 보관 기간 안내 ({RETENTION_DAYS}일)</h2>
      </div>
      <ul className="list-disc space-y-1.5 pl-5 text-xs leading-5 text-amber-900">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
