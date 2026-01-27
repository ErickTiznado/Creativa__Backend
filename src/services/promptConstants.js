/**
 * Constantes para el sistema de generación de prompts.
 * Define límites, modelos, configuraciones y definiciones de estilo.
 * Agregadas definiciones detalladas de estilos.
 */

export const PROMPT_CONFIG = {
    // Límites de validación
    VALIDATION: {
        MIN_BRIEF_LENGTH: 50,
        MAX_BRIEF_LENGTH: 2000,
        ALLOWED_FORMATS: ['png', 'jpeg', 'webp'],
        VARIATIONS: {
            MIN: 1,
            MAX: 4,
            DEFAULT: 1
        }
    },

    // Configuración del Modelo (Gemini 2.5 Pro)
    MODEL: {
        NAME: 'gemini-2.5-pro',
        DEFAULT_ASPECT_RATIO: '16:9',
        MAX_OUTPUT_TOKENS: 8192
    },

    // Lista simple de IDs de estilos permitidos
    STYLES: [
        'photorealistic',
        'cinematic',
        'digital-art',
        'oil-painting',
        'minimalist',
        'neon-punk',
        'corporate',
        'sketch',
        'anime',
        '3d-render'
    ]
};

// Mapa detallado de modificadores por estilo
export const STYLE_DEFINITIONS = {
    'photorealistic': 'Highly detailed, 8k resolution, hyperrealistic photography, sharp focus, professional lighting, shot on 35mm lens.',
    'cinematic': 'Cinematic lighting, dramatic atmosphere, movie scene aesthetic, wide angle, color graded, volumetric lighting, depth of field.',
    'digital-art': 'High quality digital illustration, clean lines, vibrant colors, detailed composition, trending on ArtStation.',
    'oil-painting': 'Textured brushstrokes, canvas texture visible, classical art style, rich colors, expressive technique.',
    'minimalist': 'Clean composition, negative space, simple shapes, limited color palette, flat design, modern aesthetic.',
    'neon-punk': 'Cyberpunk aesthetic, neon lights, dark atmosphere, futuristic elements, glowing accents, high contrast.',
    'corporate': 'Professional business imagery, clean well-lit environment, modern office aesthetic, trustworthy, high-end stock photography style.',
    'sketch': 'Pencil drawing style, rough lines, artistic shading, monochrome or sepia tones, hand-drawn aesthetic.',
    'anime': 'Anime art style, cel shading, vibrant colors, expressive characters, detailed backgrounds, Studio Ghibli inspired.',
    '3d-render': '3D rendered image, Octane render, ray tracing, realistic materials, studio lighting, unreal engine 5 quality.'
};

export const SYSTEM_INSTRUCTIONS = {
    // Instrucción base optimizada para Gemini 2.5 Pro
    BASE: `You are an expert Prompt Engineer for Gemini. Your goal is to create detailed, structured image generation prompts based on user briefs and brand guidelines.
    
Structure the output to maximize visual fidelity and brand adherence. Maintain a professional tone.`,

    NEGATIVE_PROMPT_DEFAULT: [
        "blurry", "low quality", "distorted", "text watermark",
        "bad anatomy", "deformed", "pixelated", "out of frame",
        "disfigured", "ugly", "grainy", "watermark", "signature", "cut off"
    ]
};

export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    RAG_ERROR: 'RAG_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
};