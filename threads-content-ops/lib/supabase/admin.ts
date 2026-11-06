// 공용 기준 코드 사본(work-inbox-client 등)이 쓰는 이름 `@/lib/supabase/admin` → 이 프로그램의 서비스 롤 클라이언트.
// 사본 파일을 고치지 않고 경로만 맞추기 위한 재내보내기(2026-11-06 U10).
export { createServiceClient as createAdminClient } from "./service";
