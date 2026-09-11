import { z } from "zod";

export const postFormSchema = z.object({
  title: z.string().trim().min(1, "제목을 입력해주세요.").max(100, "제목은 100자를 초과할 수 없습니다."),
  content: z.string().trim().min(1, "게시글 내용을 입력해주세요."),
  targetId: z.string().uuid("등록할 카페를 선택해주세요."),
});

export type PostFormValues = z.infer<typeof postFormSchema>;

export const authSchema = z.object({
  email: z.string().trim().email("올바른 이메일 형식이 아닙니다."),
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다."),
});
