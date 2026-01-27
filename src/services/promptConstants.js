/**
 * Constantes para el sistema de generación de prompts.
 * Define límites, modelos, configuraciones y definiciones de estilo.
 * ADAPTADO: Textos en Español para visualización del usuario
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
    'photorealistic': 'Altamente detallado, resolución 8k, fotografía hiperrealista, enfoque nítido, iluminación profesional, lente de 35mm.',
    'cinematic': 'Iluminación cinematográfica, atmósfera dramática, estética de película, plano general, gradación de color, iluminación volumétrica, profundidad de campo.',
    'digital-art': 'Ilustración digital de alta calidad, líneas limpias, colores vibrantes, composición detallada, tendencia en ArtStation.',
    'oil-painting': 'Pinceladas texturizadas, textura de lienzo visible, estilo de arte clásico, colores ricos, técnica expresiva.',
    'minimalist': 'Composición limpia, espacio negativo, formas simples, paleta de colores limitada, diseño plano, estética moderna.',
    'neon-punk': 'Estética cyberpunk, luces de neón, atmósfera oscura, elementos futuristas, acentos brillantes, alto contraste.',
    'corporate': 'Imagen de negocios profesional, entorno limpio y bien iluminado, estética de oficina moderna, confiable, estilo de fotografía de stock premium.',
    'sketch': 'Estilo de dibujo a lápiz, líneas bocetadas, sombreado artístico, tonos monocromáticos o sepia, estética hecha a mano.',
    'anime': 'Estilo de arte anime, cel shading, colores vibrantes, personajes expresivos, fondos detallados, inspirado en Studio Ghibli.',
    '3d-render': 'Renderizado 3D, render Octane, trazado de rayos (ray tracing), materiales realistas, iluminación de estudio, calidad Unreal Engine 5.'
};

export const SYSTEM_INSTRUCTIONS = {
    // Instrucción base optimizada para Gemini 2.5 Pro
    BASE: `Actúa como un experto en arte digital y diseño visual. 
    Experto en creación de imágenes para marketing digital y redes sociales.
    Alta calidad, altamente detallado, obra maestra, composición profesional, resolución 8k, enfoque nítido.`,

    NEGATIVE_PROMPT_DEFAULT: [
        "borroso", "baja calidad", "distorsionado", "marca de agua de texto",
        "mala anatomía", "deforme", "pixelado", "fuera de encuadre",
        "desfigurado", "feo", "granulado", "firma", "cortado"
    ]
};

export const ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR',
    AUTH_ERROR: 'AUTH_ERROR',
    RAG_ERROR: 'RAG_ERROR',
    INTERNAL_ERROR: 'INTERNAL_ERROR'
};