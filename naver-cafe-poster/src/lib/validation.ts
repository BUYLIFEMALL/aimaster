import { z } from "zod";

// AI 글쓰기(초안)는 "생성 → 수정 → 검수 → 배포"가 분리된 단계라, 저장 시점에는
// 카페(targetId)를 아직 안 골랐어도 임시저장할 수 있어야 한다 — 배포할 때만 필수로 확인한다.
export const draftFormSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(100, "제목은 100자를 초과할 수 없습니다."),
  content: z.string().trim().min(1, "게시글 내용을 입력해주세요."),
  targetId: z.string().uuid().optional().or(z.literal("")),
});

export type DraftFormValues = z.infer<typeof draftFormSchema>;

export const authSchema = z.object({
  email: z.string().trim().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});
