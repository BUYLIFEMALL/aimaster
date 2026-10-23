"use server";

import { MOVED_MESSAGE } from "@/components/MovedNotice";

// 2026-10-23 병합 A(v1.11): 사용 종료 — 씨드 키워드 관리는 키워드·경쟁사 분석 자동화 「🌱 키워드 확장」으로 옮겨졌다(같은 표를 그대로 씀).
export interface CreateSeedState {
  error?: string;
}

export async function createSeedAction(_formData: FormData): Promise<CreateSeedState> {
  return { error: MOVED_MESSAGE };
}

export async function toggleSeedActiveAction(_seedId: string, _isActive: boolean) {}

export async function deleteSeedAction(_seedId: string) {}

export async function deleteRunAction(_seedId: string, _runId: string) {}
