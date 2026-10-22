"use server";

import { MOVED_MESSAGE } from "@/components/MovedNotice";

// 2026-10-23 병합 A(v1.11): 사용 종료 — 텔레그램 연동은 키워드·경쟁사 분석 자동화 설정 화면으로 옮겨졌다.
// 이미 연결한 봇(program_slug=longtail-keyword-expander)은 새 앱이 그대로 읽어 쓴다.
export interface TelegramActionState {
  error?: string;
  success?: string;
}

export async function connectTelegramAction(
  _prevState: TelegramActionState,
  _formData: FormData,
): Promise<TelegramActionState> {
  return { error: MOVED_MESSAGE };
}

export async function disconnectTelegramAction() {}
