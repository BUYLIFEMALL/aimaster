"use strict";
// [이미지 모델 교체 2026-10-17] 구형(gemini-2.5-flash-image·gemini-3.1-flash-image·*-preview) → 최신 정식(gemini-nano-banana-2.1·gemini-3-pro-image), 기준: ai-image-studio v1.11 lib/providers/adapters/gemini.ts.
// 실제 이미지 생성 시험은 하지 않았음 — 이미지 생성 오류가 나면 그때 테스트 검증한다(주인님 지시).
/**
 * 나노바나나(NanoBanana) / 제미나이(Gemini) 공식 REST 엔드포인트 및 스키마 설정
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NANO_BANANA_MODEL_CONFIGS = void 0;
exports.getNanoBananaConfig = getNanoBananaConfig;
exports.NANO_BANANA_MODEL_CONFIGS = {
    'nanobanana': {
        modelName: 'gemini-nano-banana-2.1',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent',
        imageSize: '1K',
        temperature: 0.7,
    },
    'nanobanana-2-2k': {
        modelName: 'gemini-nano-banana-2.1',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent',
        imageSize: '2K',
        temperature: 0.7,
    },
    'nanobanana-2-4k': {
        modelName: 'gemini-nano-banana-2.1',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-nano-banana-2.1:generateContent',
        imageSize: '4K',
        temperature: 0.7,
    },
    'nanobanana-pro': {
        modelName: 'gemini-3-pro-image',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image:generateContent',
        imageSize: '4K',
        temperature: 0.7,
    },
};
function getNanoBananaConfig(modelType) {
    return exports.NANO_BANANA_MODEL_CONFIGS[modelType] || exports.NANO_BANANA_MODEL_CONFIGS['nanobanana-2-2k'];
}
