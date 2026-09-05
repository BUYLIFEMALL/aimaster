import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getRegisteredProviders } from "@/lib/apiKeys";
import { JobForm } from "@/components/jobs/JobForm";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function NewJobPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const registered = await getRegisteredProviders(supabase, user.id);
  const providers = [...registered];

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-semibold text-neutral-900">작업 목록 새로 만들기</h1>

      {providers.length === 0 ? (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          API 키 등록이 필요합니다. 크롤링한 페이지를 분석하려면 OpenAI 또는 Gemini API 키를 먼저
          등록해주세요.{" "}
          <Link href="/settings" className="font-medium underline">
            설정 페이지로 이동
          </Link>
        </div>
      ) : (
        <JobForm providers={providers} />
      )}

      <div className="mt-10 space-y-4">
        <div className="rounded-lg border border-neutral-200 bg-white p-5">
          <h2 className="mb-1 text-sm font-semibold text-neutral-900">💡 이렇게 입력하면 됩니다 (예시)</h2>
          <p className="mb-4 text-xs text-neutral-500">
            상세 페이지 1개가 아니라, 여러 항목이 함께 나열된 <b>목록/리스트 페이지</b> URL을
            넣어야 여러 건을 한 번에 수집할 수 있습니다.
          </p>

          <div className="space-y-3">
            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-sm font-medium text-neutral-900">예시 1. 쇼핑몰 상품 목록</p>
              <p className="mt-2 text-xs text-neutral-500">URL</p>
              <p className="font-mono text-xs text-neutral-700">
                https://쇼핑몰주소.com/category/전자제품
              </p>
              <p className="mt-2 text-xs text-neutral-500">수집 항목</p>
              <p className="text-xs text-neutral-700">상품명, 가격, 평점, 리뷰수</p>
            </div>

            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-sm font-medium text-neutral-900">예시 2. 채용 공고 목록</p>
              <p className="mt-2 text-xs text-neutral-500">URL</p>
              <p className="font-mono text-xs text-neutral-700">
                https://채용사이트.com/jobs?region=서울
              </p>
              <p className="mt-2 text-xs text-neutral-500">수집 항목</p>
              <p className="text-xs text-neutral-700">공고 제목, 회사명, 근무지역, 마감일</p>
            </div>

            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-sm font-medium text-neutral-900">예시 3. 부동산 매물 목록</p>
              <p className="mt-2 text-xs text-neutral-500">URL</p>
              <p className="font-mono text-xs text-neutral-700">
                https://부동산사이트.com/list?area=강남구
              </p>
              <p className="mt-2 text-xs text-neutral-500">수집 항목</p>
              <p className="text-xs text-neutral-700">매물명, 보증금, 월세, 평수, 층수</p>
            </div>

            <div className="rounded-lg bg-neutral-50 p-3">
              <p className="text-sm font-medium text-neutral-900">예시 4. 연습용 테스트 사이트</p>
              <p className="mt-2 text-xs text-neutral-500">URL</p>
              <p className="font-mono text-xs text-neutral-700">
                https://books.toscrape.com/catalogue/category/books/mystery_3/index.html
              </p>
              <p className="mt-2 text-xs text-neutral-500">수집 항목</p>
              <p className="text-xs text-neutral-700">책 제목, 가격, 재고 여부</p>
              <p className="mt-2 text-[11px] text-neutral-400">
                실제 사이트 사용이 처음이라 테스트부터 해보고 싶다면 이 주소로 먼저 시도해보세요.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 p-5">
          <h2 className="mb-3 text-sm font-semibold text-red-800">🚫 이런 경우엔 수집이 안 됩니다</h2>
          <ul className="list-disc space-y-1.5 pl-5 text-xs text-red-800">
            <li>로그인해야만 보이는 페이지 (마이페이지, 회원 전용 게시판 등)</li>
            <li>
              robots.txt로 수집이 막혀 있거나, 캡차·자동 접근 차단(WAF)이 걸린 사이트 — 사람이
              직접 확인해서 우회하는 기능은 지원하지 않아 즉시 작업 실패로 처리됩니다
            </li>
            <li>전화번호·이메일·주민번호 같은 개인정보를 대량으로 모으려는 목적</li>
            <li>기사 본문, 소설 등 저작물 전문을 통째로 복제하려는 목적</li>
            <li>대상 사이트의 이용약관이 크롤링을 명시적으로 금지하는 경우</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
