import Link from "next/link";
import { requireProgramAccess } from "@/lib/access";
import { PageHeader, Notice } from "@/components/ui/PageHeader";
import { getSetupStatus } from "@/lib/setupStatus";
import { createClient } from "@/lib/supabase/server";
import { listShopProducts } from "@/lib/shop";
import { CheckCircle2, Circle, BookOpen, KeyRound, Package, ArrowRight, ShieldCheck, Activity, SendHorizontal, Zap } from "lucide-react";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

function Step({ done, n, title, detail, children }: { done: boolean; n: number; title: string; detail: string; children?: React.ReactNode }) {
  return (
    <li className="flex gap-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition hover:border-rose-200">
      <span className="mt-0.5 shrink-0">{done ? <CheckCircle2 size={22} className="text-[#FA0050]" /> : <Circle size={22} className="text-slate-300" />}</span>
      <div className="min-w-0 space-y-1.5">
        <p className="text-sm font-extrabold text-slate-900">
          {n}. {title} {done && <span className="ml-1.5 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-bold text-[#FA0050] border border-rose-200">준비됨</span>}
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
  const supabase = await createClient();

  // 대시보드 4대 KPI 지표 실측
  const [shopRes, jobsRes] = await Promise.all([
    listShopProducts(user.id),
    supabase.from("elevenst_register_jobs").select("id", { count: "exact", head: true }).eq("user_id", user.id),
  ]);

  const readyProductCount = shopRes.rows.length;
  const registeredCount = jobsRes.count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader emoji="🏪" title="AI 11번가 상품 자동등록기" description="상세페이지에서 만든 상품을 11번가 공식 Seller API로 등록합니다. 판매자 화면을 대신 조작하지 않고 서버가 직접 보냅니다." />

      {/* 107. 4단계 오픈마켓 파이프라인 배너 */}
      <section className="rounded-2xl border border-rose-100 bg-gradient-to-r from-rose-50/60 via-white to-rose-50/40 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-extrabold text-[#FA0050] tracking-wider uppercase flex items-center gap-1.5">
            <Zap size={14} className="text-[#FA0050]" />
            11번가 오픈 API 셀러 자동화 파이프라인
          </span>
          <span className="text-[11px] font-bold text-slate-400">전시중지 자동 보호</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
            <div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-mono text-xs font-black text-slate-700">
              1
            </div>
            <p className="text-xs font-bold text-slate-900">상세 상품 추출</p>
            <p className="text-[11px] text-slate-500 mt-0.5">상세페이지 자동 완성</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
            <div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-mono text-xs font-black text-slate-700">
              2
            </div>
            <p className="text-xs font-bold text-slate-900">11st 규격 변환</p>
            <p className="text-[11px] text-slate-500 mt-0.5">카테고리·스펙 매핑</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
            <div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 font-mono text-xs font-black text-slate-700">
              3
            </div>
            <p className="text-xs font-bold text-slate-900">10원 절사 & 고시</p>
            <p className="text-[11px] text-slate-500 mt-0.5">규칙 위반 자동 검사</p>
          </div>
          <div className="rounded-xl border border-rose-300 bg-rose-50/80 p-3 shadow-2xs">
            <div className="mx-auto mb-1.5 flex h-7 w-7 items-center justify-center rounded-lg bg-[#FA0050] font-mono text-xs font-black text-white shadow-xs">
              4
            </div>
            <p className="text-xs font-extrabold text-[#FA0050]">11st 즉시 전송</p>
            <p className="text-[11px] text-rose-700 mt-0.5">즉시 전시중지 등록</p>
          </div>
        </div>
      </section>

      {/* 실시간 4대 KPI 카드 그리드 */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold text-slate-500">11번가 API 상태</span>
            <Activity size={16} className={s.elevenstKey ? "text-emerald-500" : "text-amber-500"} />
          </div>
          <p className="text-lg font-black text-slate-900">
            {s.elevenstKey ? "정상 연동 200 OK" : "키 미등록"}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {s.elevenstKey ? "서울 서버 직접 통신" : "API 키 등록 필요"}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold text-slate-500">등록 대기 상품</span>
            <Package size={16} className="text-[#FA0050]" />
          </div>
          <p className="text-lg font-black text-slate-900">{readyProductCount}건</p>
          <p className="text-[11px] text-slate-500 mt-1">상세페이지 연계 상품</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold text-slate-500">11번가 등록 완료</span>
            <SendHorizontal size={16} className="text-emerald-600" />
          </div>
          <p className="text-lg font-black text-slate-900">{registeredCount}건</p>
          <p className="text-[11px] text-slate-500 mt-1">누적 성공 및 전시중지</p>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-bold text-slate-500">데이터 보관 정책</span>
            <ShieldCheck size={16} className="text-blue-600" />
          </div>
          <p className="text-lg font-black text-slate-900">30일 보관</p>
          <p className="text-[11px] text-slate-500 mt-1">저장 구독 시 자동 연장</p>
        </div>
      </section>

      <Notice tone="tip">
        💡 <b>안전한 공식 Seller API 연동</b>: 11번가 공식 Seller API를 통해 서버가 직접 통신하므로 브라우저 조작 차단 위험이 없습니다. 등록 즉시 자동으로 전시중지되므로 셀러오피스에서 최종 점검 후 판매를 개시하세요.
      </Notice>

      <section className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900">처음 설정 3단계</h2>
        <ol className="space-y-3">
          <Step
            done={Boolean(s.elevenstKey)}
            n={1}
            title="11번가 API 키"
            detail={s.elevenstKey ? `등록된 11번가 키를 씁니다(${s.elevenstKey}, 상품소싱기와 같은 키).` : "11번가 셀러오피스 › OPEN API 센터 › API 관리에서 키를 확인해 「API키등록·플랫폼연동」에 등록합니다."}
          >
            {!s.elevenstKey && (
              <Link href="/connect" className="inline-flex items-center gap-1 text-xs font-bold text-[#FA0050] hover:underline mt-1">
                API 키 등록하러 가기 <ArrowRight size={12} />
              </Link>
            )}
          </Step>
          <Step done={false} n={2} title="연결 시험" detail="「API키등록·플랫폼연동」에서 「연결 시험(읽기만)」을 눌러 출고지·반품/교환지가 보이면 준비 끝입니다. 고정 IP(Fixie)는 필요 없습니다 — 이 프로그램은 한국(서울) 서버에서 11번가에 직접 연결합니다.">
            <Link href="/connect" className="inline-flex items-center gap-1 text-xs font-bold text-[#FA0050] hover:underline">
              연결 시험하러 가기 <ArrowRight size={12} />
            </Link>
          </Step>
          <Step done={false} n={3} title="상품 등록 정보 채우고 검사" detail="「상품 등록」에서 상세페이지 상품을 고르고 카테고리·가격·배송·고시를 채운 뒤 「검사하기」를 누릅니다. 배송·안내 문구는 한 번 넣으면 다음 상품에 미리 채워집니다.">
            <Link href="/products" className="inline-flex items-center gap-1 text-xs font-bold text-[#FA0050] hover:underline">
              상품 등록하러 가기 <ArrowRight size={12} />
            </Link>
          </Step>
        </ol>
      </section>

      <div className="pt-2">
        <Link href="/guide" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FA0050] hover:underline">
          <BookOpen size={16} /> 11번가 연동 & 사용 매뉴얼 보기 →
        </Link>
      </div>
    </div>
  );
}
