import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { getSetupStatus } from "@/lib/setupStatus";
import { CheckCircle2, Circle, BookOpen } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function Step({ done, n, title, detail, children }: { done: boolean; n: number; title: string; detail: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
      <span className="mt-0.5 shrink-0">{done ? <CheckCircle2 size={20} className="text-emerald-600" /> : <Circle size={20} className="text-slate-300" />}</span>
      <div className="min-w-0 space-y-1">
        <p className="text-sm font-extrabold text-slate-900">
          {n}. {title} {done && <span className="ml-1 text-xs font-bold text-emerald-700">준비됨</span>}
        </p>
        <p className="text-[13px] leading-relaxed text-slate-600">{detail}</p>
        {children}
      </div>
    </li>
  );
}

export default async function HomePage() {
  const user = await requireProgramAccess();
  const s = await getSetupStatus(user.id);

  return (
    <div className="space-y-6">
      <PageHeader emoji="🏪" title="AI 11번가 상품 자동등록기" description="상세페이지에서 만든 상품을 11번가 공식 Seller API로 등록합니다. 판매자 화면을 대신 조작하지 않고 서버가 직접 보냅니다." />

      <Notice tone="warn">
        <b>지금은 준비 단계입니다.</b> 키 등록과 연결 시험은 지금 할 수 있고, 상품 등록 화면은 다음 버전에서 열립니다.
      </Notice>

      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900">처음 설정 2단계</h2>
        <ol className="space-y-3">
          <Step
            done={Boolean(s.elevenstKey)}
            n={1}
            title="11번가 API 키"
            detail={s.elevenstKey ? `등록된 11번가 키를 씁니다(${s.elevenstKey}, 상품소싱기와 같은 키).` : "11번가 셀러오피스 › OPEN API 센터 › API 관리에서 키를 확인해 「API키등록·플랫폼연동」에 등록합니다."}
          />
          <Step done={false} n={2} title="연결 시험" detail="「API키등록·플랫폼연동」에서 「연결 시험(읽기만)」을 눌러 출고지·반품/교환지가 보이면 준비 끝입니다. 고정 IP(Fixie)는 필요 없습니다 — 이 프로그램은 한국(서울) 서버에서 11번가에 직접 연결합니다.">
            <Link href="/connect" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-700 hover:underline">
              연결 시험하러 가기
            </Link>
          </Step>
        </ol>
      </section>

      <Link href="/guide" className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-700 hover:underline">
        <BookOpen size={15} /> 연동 & 사용 매뉴얼 보기
      </Link>
    </div>
  );
}
