// 공용 발행 엔진 — 형식·오류 분류 (워드프레스·구글 블로그 공통)
// 블로그 핵심 지침: 회원이 고른 방식(발행 전까지=초안 / 바로 발행 / 예약)으로만 올리고,
// 결과가 불확실하면 자동으로 다시 올리지 않는다(재시도 없음).

export type PublishMode = "draft" | "publish" | "schedule";

export interface PublishInput {
  title: string;
  /** 완성된 본문 HTML(이미지는 https 절대 주소) */
  html: string;
  mode: PublishMode;
  /** 예약일 때 필수 — ISO 시각(UTC 권장) */
  scheduledAt?: string;
  /** 검색 결과 요약(메타 설명) */
  excerpt?: string;
  /** 글 주소 끝부분(워드프레스만) */
  slug?: string;
  /** 워드프레스 태그 이름 / 구글 블로그 라벨 */
  tags?: string[];
  /** 워드프레스 카테고리 ID */
  categoryIds?: number[];
  /** 워드프레스 대표 이미지 미디어 ID */
  featuredMediaId?: number;
}

export type PublishStatus = "draft" | "published" | "scheduled";

export interface PublishResult {
  status: PublishStatus;
  remoteId: string;
  url: string | null;
  scheduledAt: string | null;
  /** 상태 읽기에서만: 실제 공개 시각 */
  publishedAt?: string | null;
}

export type PublishErrorCode =
  | "auth" // 인증 실패(비밀번호·토큰)
  | "auth_header_stripped" // 호스팅이 Authorization 머리글을 지움(워드프레스 공유 호스팅)
  | "forbidden" // 권한 없음(글쓰기 권한·범위 부족)
  | "not_found" // 사이트·블로그·글 없음 / REST API 꺼짐
  | "bad_request" // 입력값 오류
  | "rate_limited" // 호출 한도
  | "server" // 상대 서버 오류(응답을 받았고 처리 실패)
  | "network" // 요청이 상대에게 닿지 않음(다시 시도해도 중복 위험 없음)
  | "uncertain"; // 보냈지만 결과를 모름 — 자동 재시도 금지, 회원이 플랫폼에서 확인

export class PublishError extends Error {
  readonly code: PublishErrorCode;
  readonly status: number | null;
  /** 앞 단계가 이미 성공해 플랫폼에 남은 글(예: 예약 걸기 실패 전 초안 저장) */
  readonly partial: PublishResult | null;
  constructor(code: PublishErrorCode, message: string, opts: { status?: number | null; partial?: PublishResult | null } = {}) {
    super(message);
    this.name = "PublishError";
    this.code = code;
    this.status = opts.status ?? null;
    this.partial = opts.partial ?? null;
  }
}

/** 예약 시각 검사 — 지금부터 5분 뒤 ~ 1년 안 */
export function checkScheduledAt(iso: string | undefined, now = Date.now()): string {
  if (!iso) throw new PublishError("bad_request", "예약 시각을 입력해 주세요.");
  const t = Date.parse(iso);
  if (Number.isNaN(t)) throw new PublishError("bad_request", "예약 시각 형식이 올바르지 않습니다.");
  if (t < now + 5 * 60_000) throw new PublishError("bad_request", "예약 시각은 지금부터 5분 뒤 이후로 정해 주세요.");
  if (t > now + 365 * 24 * 3600_000) throw new PublishError("bad_request", "예약은 1년 안으로만 할 수 있습니다.");
  return new Date(t).toISOString();
}

export function checkInput(input: PublishInput): void {
  if (!input.title?.trim()) throw new PublishError("bad_request", "제목이 비어 있습니다.");
  if (!input.html?.trim()) throw new PublishError("bad_request", "본문이 비어 있습니다.");
  if (!["draft", "publish", "schedule"].includes(input.mode)) throw new PublishError("bad_request", "발행 방식을 골라 주세요.");
}
