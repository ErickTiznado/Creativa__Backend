// src/domain/services/prompt/promptConstants.js

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
    NAME: "gemini-3-pro-image-preview",
    DEFAULT_ASPECT_RATIO: "16:9",
    MAX_OUTPUT_TOKENS: 8192,
  },

  // Lista simple de IDs de estilos permitidos
  STYLES: [
    "cinematic",
    "anime",
    "3d-render",
    "oil-painting",
    "cyberpunk",
    "minimalist",
  ],
};

// Mapa detallado de modificadores por estilo
export const STYLE_DEFINITIONS = {
  cinematic: {
    description: "The visual style must emulate high-end Hollywood cinematography. Key features include moody, dramatic lighting (chiaroscuro), volumetric fog or atmospheric haze, anamorphic lens artifacts such as subtle lens flares and bokeh, cinematic color grading, and a shallow depth of field that sharply separates the subject from the background.",
  },
  anime: {
    description: "The visual style must be a high-quality anime illustration inspired by Studio Ghibli. It features vibrant and rich colors, clean cel-shaded rendering, highly detailed and painted backgrounds, expressive features, and a cohesive, painterly 2D aesthetic rendered in 4k resolution.",
  },
  "3d-render": {
    description: "The visual style must resemble a cutting-edge 3D render created in Unreal Engine 5 or Cinema 4D using the Octane render engine. It must feature hyper-realistic materials, flawless ray-traced global illumination, studio-quality lighting setups, and extreme attention to microscopic textures and reflections.",
  },
  "oil-painting": {
    description: "The visual style must closely resemble a classical oil painting. It must showcase rich, deeply saturated colors, expressive and highly visible textured brushstrokes, authentic canvas texture peeking through the paint, and a masterful handling of light and shadow characteristic of traditional fine art.",
  },
  cyberpunk: {
    description: "The visual style must evoke a gritty, high-tech cyberpunk aesthetic. It must prominently feature high-contrast environments dominated by deep shadows and intense, vivid neon lights. Key elements include futuristic tech, reflective wet surfaces, glowing accents, and a moody, dystopian atmosphere.",
  },
  minimalist: {
    description: "The visual style must adhere to strict minimalism. It relies heavily on abundant, clean negative space, simple and bold geometric shapes, a highly restricted but elegant color palette, flat design aesthetics, and an overall modern, uncluttered composition that draws focus entirely to the subject.",
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

export const BRAND_ENFORCEMENT = {
  // REGLA 1: COMPOSICIÓN (Prepara el terreno para el estampado)
  COMPOSITION_RULE: `
    COMPOSITION & LAYOUT CRITICAL INSTRUCTION:
    - The image MUST have CLEAN NEGATIVE SPACE in the top-left corner.
    - Do NOT place complex objects, bright lights, faces, or busy textures in the top-left area.
    - This area is reserved for a branding overlay that will be applied later. Keep it uncluttered.
  `,
  // REGLA 2: ATMÓSFERA (Gradientes Rojizos)
  ATMOSPHERE_RULE: `
    BRAND ATMOSPHERE:
    - Regardless of the scene, the lighting MUST feature SUBTLE REDDISH GRADIENTS (Hex #FF0000 to #8B0000 range).
    - The red gradient should act as a cinematic light source or an ambient glow blending into the shadows.
  `,
};

export const ERROR_CODES = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  AUTH_ERROR: "AUTH_ERROR",
  RAG_ERROR: "RAG_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
};
