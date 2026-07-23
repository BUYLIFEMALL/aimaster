"use strict";
/**
 * 나노바나나(NanoBanana) / 제미나이(Gemini) 정식 모델별 :generateContent 엔드포인트 유틸리티 (독립 프로그램용)
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NANO_BANANA_MODEL_CONFIGS = void 0;
exports.getNanoBananaConfig = getNanoBananaConfig;
exports.NANO_BANANA_MODEL_CONFIGS = {
    'nanobanana': {
        modelName: process.env.NANO_BANANA_2_LITE_MODEL || 'gemini-3.1-flash-lite-image-preview',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-image-preview:generateContent',
        imageSize: '1K',
        temperature: 0.7,
    },
    'nanobanana-2-2k': {
        modelName: process.env.NANO_BANANA_2_MODEL || 'gemini-3.1-flash-image-preview',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent',
        imageSize: '2K',
        temperature: 0.7,
    },
    'nanobanana-2-4k': {
        modelName: process.env.NANO_BANANA_2_MODEL || 'gemini-3.1-flash-image-preview',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent',
        imageSize: '4K',
        temperature: 0.7,
    },
    'nanobanana-pro': {
        modelName: process.env.NANO_BANANA_PRO_MODEL || 'gemini-3-pro-image-preview',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent',
        imageSize: '4K',
        temperature: 0.7,
    },
};
function getNanoBananaConfig(modelType) {
    return exports.NANO_BANANA_MODEL_CONFIGS[modelType] || exports.NANO_BANANA_MODEL_CONFIGS['nanobanana-2-2k'];
}
