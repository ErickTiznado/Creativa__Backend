/**
 * Constantes actualizadas para Gemini Flash Image
 */
export const IMAGE_GEN_CONFIG = {
    MODEL_NAME: 'gemini-2.5-flash-image',

    LIMITS: {
        MAX_SAMPLE_COUNT: 4,
        MIN_SAMPLE_COUNT: 1,
        DEFAULT_SAMPLE_COUNT: 1
    },

    ASPECT_RATIOS: {
        SQUARE: '1:1',
        LANDSCAPE: '16:9',
        PORTRAIT: '9:16',
        WIDE: '21:9'
    },

    DEFAULTS: {
        aspectRatio: '1:1',
        sampleCount: 1
    }
};

export const IMAGE_ERROR_CODES = {
    SAFETY_BLOCK: 'SAFETY_BLOCK',
    QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
    MODEL_ERROR: 'MODEL_ERROR'
};