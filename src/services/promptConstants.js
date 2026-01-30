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
    ALLOWED_FORMATS: ["png", "jpeg", "webp"],
    VARIATIONS: {
      MIN: 1,
      MAX: 4,
      DEFAULT: 1,
    },
  },

  // Configuración del Modelo (Gemini 2.5 Pro)
  MODEL: {
    NAME: "gemini-2.5-pro",
    DEFAULT_ASPECT_RATIO: "16:9",
    MAX_OUTPUT_TOKENS: 8192,
  },

  // Lista simple de IDs de estilos permitidos
  STYLES: [
    "photorealistic",
    "cinematic",
    "digital-art",
    "oil-painting",
    "minimalist",
    "neon-punk",
    "corporate",
    "sketch",
    "anime",
    "3d-render",
  ],
};

// Mapa detallado de modificadores por estilo
export const STYLE_DEFINITIONS = {
  photorealistic: {
    prefix: "Professional commercial photography of",
    suffix:
      "8k resolution, highly detailed, sharp focus, 35mm lens, raw photo, f/8, natural lighting",
  },
  cinematic: {
    prefix: "Cinematic shot of",
    suffix:
      "dramatic lighting, movie aesthetic, wide angle, color grading, volumetric lighting, depth of field, anamorphic lens",
  },
  "digital-art": {
    prefix: "High quality digital art of",
    suffix:
      "clean lines, vibrant colors, detailed composition, trending on ArtStation, sharp details",
  },
  "oil-painting": {
    prefix: "Oil painting of",
    suffix:
      "textured brushstrokes, visible canvas texture, classic art style, rich colors, expressive technique",
  },
  minimalist: {
    prefix: "Minimalist composition of",
    suffix:
      "clean background, negative space, simple shapes, limited color palette, flat design, modern aesthetic",
  },
  "neon-punk": {
    prefix: "Cyberpunk aesthetic shot of",
    suffix:
      "neon lights, dark atmosphere, futuristic elements, glowing accents, high contrast, ray tracing",
  },
  corporate: {
    prefix: "Professional corporate imagery of",
    suffix:
      "clean environment, bright lighting, modern office aesthetic, trustworthy, premium stock photography style",
  },
  sketch: {
    prefix: "Pencil sketch of",
    suffix:
      "rough lines, artistic shading, monochromatic or sepia tones, hand-drawn aesthetic, graphite texture",
  },
  anime: {
    prefix: "Anime style illustration of",
    suffix:
      "cel shading, vibrant colors, expressive characters, detailed backgrounds, Studio Ghibli inspired, 4k",
  },
  "3d-render": {
    prefix: "3D render of",
    suffix:
      "Octane render, ray tracing, realistic materials, studio lighting, Unreal Engine 5 quality, C4D",
  },
};

export const SYSTEM_INSTRUCTIONS = {
  // Instrucción base: Quality Boilerplate (Adiós a la personalidad)
  BASE: `Award-winning composition, commercial photography, extremely detailed, 8k, raw photo, hyperrealistic, professional visuals.`,

  NEGATIVE_PROMPT_DEFAULT: [
    "blurry",
    "low quality",
    "distorted",
    "bad anatomy",
    "deformed",
    "pixelated",
    "out of frame",
    "disfigured",
    "ugly",
    "grainy",
    "cut off",
    // STRICT NO TEXT POLICY
    "text",
    "watermark",
    "typography",
    "letters",
    "words",
    "signature",
    "logo text",
    "brand name",
    "writing",
    "alphabet",
    "numbers",
    "label",
    "signage",
    // Domain Specific Negatives (Anti-Hologram/Sci-Fi Clichés for realistic ask)
    "hologram",
    "futuristic interface",
    "floating elements",
    "blue glow",
    "cgi",
    "fantasy",
    "flying objects",
    "neon circles",
    "complex hud",
  ],
};

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTH_ERROR: "AUTH_ERROR",
  RAG_ERROR: "RAG_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};
