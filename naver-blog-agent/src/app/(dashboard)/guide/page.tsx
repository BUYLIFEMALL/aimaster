import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, BookOpen, CheckCircle2, Download } from "lucide-react";
import { APP_VERSION } from "@/lib/version";
import { RETENTION_DAYS } from "@/lib/retention";

const sections = [
  ["start", "처음 연결하기"],
  ["generate", "원고 생성하기"],
  ["images", "이미지 만들기·교체"],
  ["review", "저장·최종 검수"],
  ["prepare", "발행 전 준비·직접 발행"],
  ["status", "진행 상태 확인"],
  ["troubleshooting", "문제가 생겼을 때"],
  ["storage", "원고 보관·백업"],
] as const;

const quickSteps = [
  ["생성", "글감이나 주제를 고르고 원고를 만듭니다."],
  ["수정·저장", "본문과 이미지를 확인하고 저장합니다."],
  ["최종 검수", "확인란이 나오면 체크 후 검수 기록을 남깁니다."],
  ["발행 전 준비", "진행 방식을 저장하고 확장 작업 대기에 전송합니다."],
  ["직접 발행", "열린 네이버 원고를 확인하고 최종 발행합니다."],
];

function GuideSection({ id, number, title, description, children }: {
  id: string; number: number; title: string; description: string; children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 rounded-2xl border border-neutral-200 bg-white p-5 sm:p-6 space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-sm font-bold text-blue-700">{number}</span>
        <div>
          <h2 id={`${id}-title`} className="text-lg font-bold text-neutral-900">{title}</h2>
          <p className="mt-1 text-sm text-neutral-600">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function Steps({ children }: { children: ReactNode }) {
  return <ol className="list-decimal space-y-3 pl-5 text-sm leading-7 text-neutral-700 marker:font-bold marker:text-blue-700">{children}</ol>;
}

export default function GuidePage() {
  const currentYear = new Date().getFullYear();
  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-12">
      <header className="space-y-3">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
          <BookOpen className="h-4 w-4" /> 사용 안내 · {APP_VERSION}
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900 sm:text-3xl">네이버 블로그 에이전트 사용 방법</h1>
        <p className="text-sm leading-7 text-neutral-600">원고를 만들고 최종 확인한 뒤, 크롬 확장으로 네이버 글쓰기 화면에 입력하는 방법을 순서대로 안내합니다.</p>
      </header>

      <section aria-labelledby="quick-start-title" className="rounded-2xl border border-blue-200 bg-blue-50/50 p-5 sm:p-6 space-y-4">
        <h2 id="quick-start-title" className="text-base font-bold text-neutral-900">추천 사용 순서: 발행 전 준비까지만</h2>
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {quickSteps.map(([title, text], index) => (
            <li key={title} className="rounded-xl border border-blue-100 bg-white p-3">
              <p className="text-sm font-bold text-blue-800">{index + 1}. {title}</p>
              <p className="mt-1 text-sm leading-6 text-neutral-600">{text}</p>
            </li>
          ))}
        </ol>
        <p className="text-sm leading-7 text-blue-900"><strong>전송 전 확인:</strong> ‘확장 진행 방식’에서 <strong>발행 전 준비까지만 · 최종 버튼은 직접 누름</strong>을 선택하고 <strong>발행 설정 저장</strong>을 눌러 주세요. 기존 원고는 자동 발행으로 설정되어 있을 수 있습니다.</p>
      </section>

      <nav aria-label="사용 안내 목차" className="rounded-2xl border border-neutral-200 bg-white p-5">
        <p className="mb-3 text-sm font-bold text-neutral-900">필요한 내용 바로 찾기</p>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {sections.map(([id, label], index) => (
            <a key={id} href={`#${id}`} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-700 hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-blue-600">{index + 1}. {label}</a>
          ))}
        </div>
      </nav>

      <GuideSection id="start" number={1} title="처음 연결하기" description="본인 회원 계정·API 키·네이버 계정을 연결합니다. 이미 연결했다면 다음 단계로 이동하세요.">
        <Steps>
          <li><Link href="/settings" className="font-semibold text-blue-700 underline">API키등록·플랫폼연동</Link>에서 사용할 AI 공급사의 <strong>본인 API 키</strong>를 등록합니다. 다른 프로그램에서 같은 회원 계정에 등록한 키도 사용할 수 있습니다. 키가 없으면 먼저 등록해야 합니다.</li>
          <li>같은 설정 화면에서 본인이 운영하는 <strong>네이버 블로그 ID</strong>를 등록합니다. 블로그 주소가 blog.naver.com/myblog라면 ID는 myblog입니다.</li>
          <li>아래 최신 확장 ZIP을 다운로드하고 압축을 풉니다. 크롬 주소창에 <code className="rounded bg-neutral-100 px-1">chrome://extensions</code>를 입력한 뒤 <strong>개발자 모드 → 압축해제된 확장 프로그램 로드</strong>에서 압축을 푼 폴더를 선택합니다.</li>
          <li>설정 화면의 <strong>크롬 확장 페어링 코드 발급하기</strong>를 누릅니다. 크롬의 에이전트 확장 아이콘을 열어 <strong>본인 블로그 ID와 8자리 연결 코드</strong>를 입력하고 <strong>이 Chrome 연결</strong>을 누릅니다. 코드는 10분 동안 유효하며 한 번만 사용할 수 있습니다.</li>
          <li>확장의 <strong>로그인 / 상태 확인</strong>을 눌러 네이버 계정을 확인합니다. 로그인이나 보안 확인이 나오면 네이버 화면에서 직접 완료합니다. 웹에 로그인한 회원과 확장을 연결한 회원, 선택한 블로그가 서로 맞아야 합니다.</li>
        </Steps>
        <div className="flex flex-wrap gap-3">
          <a href="/downloads/naver-blog-agent-extension-latest.zip" download className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700"><Download className="h-4 w-4" />최신 확장 ZIP 다운로드 ({APP_VERSION})</a>
          <Link href="/settings" className="inline-flex items-center gap-2 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">API키등록·플랫폼연동 <ArrowRight className="h-4 w-4" /></Link>
        </div>
        <details className="rounded-xl border border-neutral-200 p-4 text-sm">
          <summary className="cursor-pointer font-semibold text-neutral-900">기존 확장을 업데이트하는 방법</summary>
          <p className="mt-3 leading-7 text-neutral-600">진행 중인 입력이 끝난 뒤 최신 ZIP을 다시 다운로드합니다. 기존 확장 폴더에 압축을 풀어 덮어쓰고 chrome://extensions에서 해당 확장의 새로고침 버튼을 누릅니다. 설치된 확장은 웹 업데이트만으로 바뀌지 않습니다. 표시되는 버전이 {APP_VERSION}인지 확인해 주세요.</p>
        </details>
      </GuideSection>

      <GuideSection id="generate" number={2} title="원고 생성하기" description="수집한 글감을 사용하거나 주제를 직접 입력할 수 있습니다.">
        <Steps>
          <li><Link href="/collector" className="font-semibold text-blue-700 underline">떡상 콘텐츠 수집</Link>에서 글감을 고르거나 <Link href="/" className="font-semibold text-blue-700 underline">콘텐츠 생성</Link> 화면에 주제를 직접 입력합니다.</li>
          <li>글의 화자(페르소나), 목표 글자 수, 발행할 블로그 ID, 콘텐츠 카테고리, 검색 키워드와 말투를 확인합니다. 페르소나를 고르면 채워지는 조건도 필요에 따라 수정할 수 있습니다.</li>
          <li><strong>AI 글·이미지 생성 기본 모델 설정</strong>에서 사용할 글 엔진과 이미지 모델·비율·장수(1~5장)를 선택합니다. <strong>기본 모델 설정 저장</strong>을 누르면 다음 접속에도 적용됩니다. 선택한 공급사의 본인 키가 등록되어 있어야 합니다.</li>
          <li><strong>5단계 AI 블로그 글 생성 시작</strong>을 누릅니다. 기획 → 초안 → 윤문 → AI 검수 → 이미지 프롬프트 준비가 진행되며, 결과 아래에서 단계별 실행 내역을 볼 수 있습니다. 이 단계에서 네이버에 글이 발행되지는 않습니다.</li>
        </Steps>
        <p className="rounded-xl bg-neutral-50 p-4 text-sm leading-7 text-neutral-700">생성 기준은 현재 연도인 <strong>{currentYear}년</strong>입니다. AI 검수 통과 표시가 있어도 사실·통계·출처·본인 경험에 맞는지 최종 원고를 직접 확인해 주세요. 이미지 프롬프트 준비와 실제 이미지 생성은 별도 단계입니다.</p>
      </GuideSection>

      <GuideSection id="images" number={3} title="이미지 만들기·교체" description="필요한 컷을 생성하고 실제 이미지를 확대해서 확인합니다.">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-neutral-200 p-4">
            <h3 className="text-sm font-bold text-neutral-900">처음 만들 때·일부 컷이 실패했을 때</h3>
            <p className="mt-2 text-sm leading-7 text-neutral-600"><strong>미생성 컷 일괄 생성</strong>을 누릅니다. 이미 만들어진 컷은 유지하고 URL이 없는 컷만 생성합니다. 일부 컷이 실패하면 성공한 이미지를 확인한 뒤 남은 컷만 다시 생성합니다.</p>
          </div>
          <div className="rounded-xl border border-neutral-200 p-4">
            <h3 className="text-sm font-bold text-neutral-900">한 장만 바꾸고 싶을 때</h3>
            <p className="mt-2 text-sm leading-7 text-neutral-600">‘각 컷별 AI 프롬프트 상세’에서 해당 이미지의 <strong>이 컷만 생성</strong>을 누릅니다. 선택한 컷을 생성·교체하고 다른 컷은 유지합니다. 이미지 삭제는 해당 이미지의 휴지통 버튼을 사용합니다.</p>
          </div>
        </div>
        <ul className="list-disc space-y-2 pl-5 text-sm leading-7 text-neutral-700">
          <li>이미지를 눌러 확대하고 깨진 글자·로고·인물·내용과의 어울림을 확인합니다. 생성 완료 표시와 이미지 품질 확인은 별개입니다.</li>
          <li><strong>이미지 변경을 서버에 저장했습니다</strong> 안내를 확인합니다. 이미지 교체·삭제 뒤에는 최종 원고를 다시 검수합니다.</li>
          <li>이미지 저장 실패가 표시되면 <strong>보관함 저장</strong>으로 저장을 먼저 확인합니다. 확인이 끝나기 전에는 추가 생성을 진행하지 않습니다.</li>
          <li>이미지를 새로 생성하거나 교체하면 선택한 공급사의 API 사용량이 발생할 수 있습니다.</li>
        </ul>
      </GuideSection>

      <GuideSection id="review" number={4} title="저장·최종 검수" description="네이버로 보낼 최종 원고와 서버 저장본이 같아야 합니다.">
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-lg bg-blue-600 px-3 py-2 text-white">파란색 · 서식·이미지 완성 뷰</span>
          <span className="rounded-lg bg-neutral-600 px-3 py-2 text-white">회색 · 원본 텍스트</span>
        </div>
        <Steps>
          <li><strong>서식·이미지 완성 뷰</strong>에서 소제목·문단·이미지 배치를 봅니다. <strong>원본 텍스트</strong>는 저장된 본문 내용을 확인하는 보기입니다.</li>
          <li><strong>스마트 에디터 편집</strong> 또는 <strong>원고 편집</strong>으로 제목·본문·이미지·태그를 수정합니다. 편집을 저장하고 <strong>서버 저장 확인됨</strong> 안내를 확인합니다. 필요한 경우 <strong>보관함 저장</strong>을 눌러 저장합니다.</li>
          <li>사실·수치·출처·표현·이미지를 확인합니다. 검수 확인란이 표시되면 아래 문구에 체크한 뒤 <strong>직접 검수 완료 기록</strong>을 누릅니다.</li>
        </Steps>
        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 font-bold text-blue-900"><CheckCircle2 className="h-5 w-5 shrink-0" /><span>최종원고 수정 및 확인 완료</span></div>
        <p className="text-sm leading-7 text-neutral-600">확인란 체크만으로 검수 기록이 저장되지는 않습니다. <strong>직접 검수 완료 기록</strong>은 회원의 확인 결과를 기록하며, AI 판정을 바꾸거나 네이버 최종 발행을 실행하지 않습니다. 검수한 뒤 제목·본문·태그·이미지를 바꾸면 다시 저장하고 검수해야 합니다.</p>
      </GuideSection>

      <GuideSection id="prepare" number={5} title="발행 전 준비·직접 발행" description="전송하기 전에 원고별 진행 방식을 먼저 저장합니다.">
        <div className="overflow-x-auto rounded-xl border border-neutral-200">
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="sr-only">확장 진행 방식 두 가지 비교</caption>
            <thead className="bg-neutral-50 text-neutral-900"><tr><th scope="col" className="p-3">확장 진행 방식</th><th scope="col" className="p-3">확장이 하는 일</th><th scope="col" className="p-3">최종 발행</th></tr></thead>
            <tbody className="text-neutral-700">
              <tr className="border-t border-neutral-200"><th scope="row" className="p-3 font-semibold text-blue-800">발행 전 준비까지만 · 최종 버튼은 직접 누름</th><td className="p-3 leading-6">본문·이미지 입력과 발행 설정까지 준비한 뒤 멈춥니다.</td><td className="p-3">회원이 네이버 화면에서 직접 누릅니다.</td></tr>
              <tr className="border-t border-neutral-200"><th scope="row" className="p-3 font-semibold">최종 발행까지 자동 진행</th><td className="p-3 leading-6">입력·설정 후 최종 발행 버튼까지 누릅니다.</td><td className="p-3">확장이 실행합니다.</td></tr>
            </tbody>
          </table>
        </div>
        <Steps>
          <li>원고의 <strong>네이버 발행 설정 → 확장 진행 방식</strong>에서 <strong>발행 전 준비까지만 · 최종 버튼은 직접 누름</strong>을 선택합니다.</li>
          <li><strong>네이버 카테고리 불러오기</strong>로 실제 블로그 메뉴를 가져와 선택합니다. 자동 등록 태그는 최대 10개입니다. 입력한 태그는 ‘추가’ 또는 Enter로 등록하고 <strong>발행 설정 저장</strong>을 누릅니다. 콘텐츠 분류 카테고리와 네이버 발행 카테고리는 서로 다른 설정입니다.</li>
          <li>공개 범위를 선택하려면 <strong>콘텐츠 보관함 상단 → 발행 공개 범위</strong>에서 비공개 또는 전체공개를 고르고 보관함에서 전송합니다. 처음에는 비공개로 준비해 볼 수 있습니다. 최종 공개 범위는 준비된 네이버 발행창에서도 확인합니다.</li>
          <li>저장과 최종 검수가 끝나면 생성 화면의 <strong>네이버 확장 작업 대기에 전송</strong> 또는 보관함의 <strong>발행 전송</strong>을 누릅니다. 입력 중에는 크롬을 켜 두고 자동으로 열린 네이버 편집기에서 직접 입력하거나 설정을 바꾸지 마세요.</li>
          <li>확장이 별도 네이버 글쓰기 탭에서 제목·소제목·본문·이미지를 입력합니다. 본문 입력 후 작업 탭이 앞으로 열리고 이미지 AI 표시와 원고·발행 설정을 확인합니다.</li>
          <li>보관함에 <strong>발행 전 준비 완료</strong>가 나타나면 열린 네이버 탭을 확인합니다. 확장 연결 화면의 <strong>준비된 원고 열기</strong>로도 열 수 있습니다. 제목·본문·이미지·카테고리·태그·공개 범위를 확인합니다. 예약 발행을 원하면 네이버 발행창에서 예약 시각을 설정·확인한 뒤 <strong>최종 발행 버튼</strong>을 직접 누릅니다.</li>
        </Steps>
        <p className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-7 text-blue-900"><strong>준비 완료는 발행 완료가 아닙니다.</strong> 직접 발행한 결과는 네이버 게시글 또는 예약 목록에서 확인합니다. 준비된 글의 발행 설정을 웹에서 바꾸면 다시 준비해야 합니다.</p>
      </GuideSection>

      <GuideSection id="status" number={6} title="진행 상태 확인" description="콘텐츠 보관함에서 원고 상태와 입력 진행을 확인합니다.">
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ["임시보관", "저장된 원고입니다. 내용·이미지·설정을 수정하고 검수할 수 있습니다."],
            ["발행 대기 중", "확장이 작업을 가져가기 전이거나 입력 중인 원고입니다. 입력 중이면 단계·완료 수·마지막 확인 시각을 봅니다."],
            ["발행 전 준비 완료", "네이버 편집기에 원고가 준비되었습니다. 직접 최종 발행해야 합니다."],
            ["발행 완료", "자동 발행 작업에서 결과가 확인된 원고입니다. 네이버에서도 결과를 확인합니다."],
          ].map(([title, description]) => <div key={title} className="rounded-xl border border-neutral-200 p-4"><dt className="text-sm font-bold text-neutral-900">{title}</dt><dd className="mt-1 text-sm leading-7 text-neutral-600">{description}</dd></div>)}
        </dl>
        <p className="text-sm leading-7 text-neutral-600">여러 원고를 일괄 전송할 때도 각 원고에 저장된 진행 방식을 먼저 확인합니다. 준비 완료된 탭은 검토가 끝날 때까지 유지해 주세요. 직접 발행 후에도 웹에는 준비 완료 상태가 남을 수 있습니다.</p>
        <Link href="/queue" className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 underline">콘텐츠 보관함 열기 <ArrowRight className="h-4 w-4" /></Link>
      </GuideSection>

      <GuideSection id="troubleshooting" number={7} title="문제가 생겼을 때" description="먼저 현재 원고와 네이버 처리 결과를 확인하고 아래 순서로 조치합니다.">
        <div className="divide-y divide-neutral-200">
          {[
            ["전송 버튼이 눌리지 않아요", "원고의 서버 저장, 발행 설정 저장, 최종 검수 완료 여부를 확인합니다. 입력 중인 태그를 추가하고 설정을 저장해 주세요. 이미지 생성·저장이 끝날 때까지 기다립니다."],
            ["화면 원고와 서버 저장본이 다르다고 나와요", "편집 내용을 먼저 복사해 보관합니다. 현재 원고를 저장한 뒤 최신 원고를 다시 열어 검수합니다. 다른 탭에서 수정했다면 보관함 목록을 갱신하고 최신 원고를 다시 여세요. 오류가 남으면 안내에 따라 저장본을 다시 확인합니다."],
            ["이미지는 생성됐는데 저장에 실패했어요", "현재 화면을 유지하고 보관함 저장으로 다시 저장합니다. 저장 확인 전에는 추가 유료 생성을 반복하지 마세요. 성공한 이미지는 보존하고 미생성 컷만 다시 생성합니다."],
            ["네이버 카테고리를 불러오지 못해요", "웹 회원·확장 연결 회원·블로그 ID가 같은지 확인합니다. 확장의 로그인 / 상태 확인에서 네이버 글쓰기 화면을 확인한 뒤, 진행 중인 확장 작업이 끝나면 다시 불러옵니다."],
            ["확장이 멈췄거나 연결이 끊겼어요", "크롬과 최신 확장이 켜져 있는지, 네이버 로그인·보안 확인이 필요한지 확인합니다. 보관함에서 단계·완료 수·마지막 확인 시각을 봅니다. 연결 만료 복구 안내가 나타나면 네이버 원고·게시글·예약 목록을 먼저 확인하고 확인란 체크 → 확인 후 복구를 누릅니다. 복구는 임시보관으로 돌아가며 자동 재입력이나 재발행을 하지 않습니다."],
            ["발행 실패 또는 결과가 불확실하다고 나와요", "열린 네이버 원고와 게시글·예약 목록에서 실제 결과를 먼저 확인합니다. 확인하기 전에 같은 원고를 다시 전송하지 마세요. 최종 발행 버튼을 누르기 전후에 따라 작성 실패와 발행 결과 불확실 안내가 달라질 수 있습니다."],
          ].map(([question, answer]) => (
            <details key={question} className="py-4 first:pt-0 last:pb-0">
              <summary className="cursor-pointer text-sm font-bold text-neutral-900">{question}</summary>
              <p className="mt-3 text-sm leading-7 text-neutral-600">{answer}</p>
            </details>
          ))}
        </div>
      </GuideSection>

      <GuideSection id="storage" number={8} title="원고 보관·백업" description="저장 확인 후 다시 열고, 보관 기간 안에 필요한 내용을 백업합니다.">
        <ul className="list-disc space-y-3 pl-5 text-sm leading-7 text-neutral-700">
          <li>생성 화면 상단 <strong>최근 원고 열기</strong>에서 저장한 원고를 다시 불러오거나 <strong>콘텐츠 보관함</strong>에서 엽니다. 다른 기기에서는 같은 회원 계정으로 로그인해 서버에 저장된 원고를 확인합니다.</li>
          <li>새로고침이나 화면 이동 전에는 저장 안내를 확인합니다. 저장되지 않은 편집 내용이나 저장 실패 상태는 자동 복원이 보장되지 않으므로 먼저 복사해 보관해 주세요.</li>
          <li>생성 원고와 이미지에는 <strong>{RETENTION_DAYS}일 보관 정책</strong>이 적용됩니다. 만료 전 원고 복사·이미지 다운로드로 별도 백업합니다. 글감의 책갈피 보호는 원고·이미지 전체를 영구 보관하는 기능이 아닙니다.</li>
          <li>웹 보관 데이터 정리는 네이버에 이미 발행된 게시글을 삭제하는 작업이 아닙니다. 발행 결과는 네이버에서 확인합니다.</li>
        </ul>
      </GuideSection>

      <footer className="flex flex-wrap gap-3 border-t border-neutral-200 pt-5">
        <Link href="/" className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700">콘텐츠 생성 시작</Link>
        <Link href="/queue" className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">콘텐츠 보관함</Link>
        <Link href="/settings" className="rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-semibold text-neutral-700">API키등록·플랫폼연동</Link>
      </footer>
    </div>
  );
}
