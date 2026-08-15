"use strict";
/**
 * 나노바나나(NanoBanana) / 제미나이(Gemini) 공식 REST 엔드포인트 및 스키마 설정
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NANO_BANANA_MODEL_CONFIGS = void 0;
exports.getNanoBananaConfig = getNanoBananaConfig;
exports.NANO_BANANA_MODEL_CONFIGS = {
    'nanobanana': {
        modelName: 'gemini-2.5-flash-image',
        endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-image:generateContent',
        imageSize: '1K',
        temperature: 0.7,
    },
    'nanobanana-2-2k': {
        modelName: 'gemini-3.1-flash-image',
        endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent',
        imageSize: '2K',
        temperature: 0.7,
    },
    'nanobanana-2-4k': {
        modelName: 'gemini-3.1-flash-image',
        endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-3.1-flash-image:generateContent',
        imageSize: '4K',
        temperature: 0.7,
    },
    'nanobanana-pro': {
        modelName: 'gemini-3-pro-image',
        endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-3-pro-image:generateContent',
        imageSize: '4K',
        temperature: 0.7,
    },
};
function getNanoBananaConfig(modelType) {
    return exports.NANO_BANANA_MODEL_CONFIGS[modelType] || exports.NANO_BANANA_MODEL_CONFIGS['nanobanana-2-2k'];
}
