// 외부 서비스 가입·키 만들기 바로가기 버튼(2026-11-03 주인님 「왜 옆에 사이트 가입 버튼이 없어?」). 새 탭으로 연다.
export function SignupLinks({ links }: { links: { label: string; href: string }[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {links.map((l) => (
        <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className="mx-btn-ghost inline-flex min-h-[36px] items-center whitespace-nowrap px-3 text-xs">
          ↗ {l.label}
        </a>
      ))}
    </div>
  );
}
