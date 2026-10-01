import { IMAGE_RETENTION_DAYS } from '@/blog/utils/imageRetention'

// "이미지 저장·보관 기간 안내" 박스 — 설정 화면(전체)과 AI 글쓰기 화면(compact)에 함께 쓴다.
// 2026-10-01: Cloudinary 연동을 없애고 AIMaster 저장소(Supabase Storage)에 자동 저장하면서, 데이터 누적을 막기 위해
// 보관 기간을 정했다(주인님 지시). 보관 기간 값은 utils/imageRetention.ts 한 곳에서 바꾼다.
export function ImageStorageNotice({ compact = false }: { compact?: boolean }) {
  const items = [
    'AI가 만든 이미지와 편집기에서 첨부한 이미지는 AIMaster 저장소에 자동으로 저장되고, 글에는 이미지 주소만 들어갑니다. 따로 이미지 저장소(Cloudinary 등)를 연결하지 않아도 됩니다.',
    `저장된 이미지는 만든 날부터 ${IMAGE_RETENTION_DAYS}일 동안 보관되고, 그 뒤에는 자동으로 삭제됩니다. 삭제된 뒤에는 글 안의 해당 이미지가 보이지 않으며 되살릴 수 없습니다.`,
    '네이버 블로그·티스토리 등 다른 블로그에 옮겨 쓸 때는 이미지를 꼭 내려받아 그 블로그에 직접 올려 주세요. "본문 복사"로 붙여넣은 이미지도 같은 주소를 쓰기 때문에 보관 기간이 지나면 보이지 않습니다.',
    '글의 제목과 본문 글자는 삭제되지 않습니다.',
  ]

  if (compact) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-[11px] leading-5 text-amber-900">
        <p className="font-bold">🗓️ 이미지 보관 기간 {IMAGE_RETENTION_DAYS}일</p>
        <p>
          생성된 이미지는 {IMAGE_RETENTION_DAYS}일 뒤 자동 삭제됩니다. 다른 블로그에 옮길 때는 이미지를 내려받아 직접 올려 주세요.
        </p>
      </div>
    )
  }

  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <div className="mb-3">
        <h2 className="text-sm font-bold text-amber-900">🖼️ 이미지 저장·보관 기간 안내</h2>
      </div>
      <ul className="list-disc space-y-1.5 pl-5 text-xs leading-5 text-amber-900">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  )
}
