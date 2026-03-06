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
    MAX_OUTPUT_TOKENS: 12192,
  },

  // Lista simple de IDs de estilos permitidos
  STYLES: [
    "cinematic",
    "anime",
    "3d-render",
    "oil-painting",
    "studio-commercial",
    "minimalist",
    "photorealistic",
    "flat-illustration",
    "vintage",
  ],
};

// Mapa detallado de modificadores por estilo
export const STYLE_DEFINITIONS = {
  cinematic: {
    description:
      "The visual style must emulate high-end Hollywood cinematography. Key features include moody, dramatic lighting (chiaroscuro), volumetric fog or atmospheric haze, anamorphic lens artifacts such as subtle lens flares and bokeh, cinematic color grading, and a shallow depth of field that sharply separates the subject from the background.",
  },
  anime: {
    description:
      "The visual style must be a high-quality anime illustration inspired by Studio Ghibli. It features vibrant and rich colors, clean cel-shaded rendering, highly detailed and painted backgrounds, expressive features, and a cohesive, painterly 2D aesthetic rendered in 4k resolution.",
  },
  "3d-render": {
    description:
      "The visual style must resemble a cutting-edge 3D render created in Unreal Engine 5 or Cinema 4D using the Octane render engine. It must feature hyper-realistic materials, flawless ray-traced global illumination, studio-quality lighting setups, and extreme attention to microscopic textures and reflections.",
  },
  "oil-painting": {
    description:
      "The visual style must closely resemble a classical oil painting. It must showcase rich, deeply saturated colors, expressive and highly visible textured brushstrokes, authentic canvas texture peeking through the paint, and a masterful handling of light and shadow characteristic of traditional fine art.",
  },
  "studio-commercial": {
    description:
      "The visual style must be a high-end commercial studio photography. It must feature impeccable lighting (softboxes, rim lights), clean backgrounds or contextually relevant settings, razor-sharp focus on the product or subject, and a polished, professional aesthetic suitable for premium advertising.",
  },
  minimalist: {
    description:
      "The visual style must adhere to strict minimalism. It relies heavily on abundant, clean negative space, simple and bold geometric shapes, a highly restricted but elegant color palette, flat design aesthetics, and an overall modern, uncluttered composition that draws focus entirely to the subject.",
  },
  photorealistic: {
    description:
      "The visual style must be indistinguishable from a professional commercial photograph taken with a high-end DSLR or medium format camera. Key features include razor-sharp focus on the subject, natural bokeh, authentic studio or location lighting, true-to-life textures, and no digital art processing.",
  },
  "flat-illustration": {
    description:
      "The visual style must be a professional flat design illustration. Key features include bold, clean geometric shapes, a limited but harmonious color palette, absence of shadows or gradients (or only subtle ones), and a modern, graphic design aesthetic suited for editorial or marketing use.",
  },
  vintage: {
    description:
      "The visual style must evoke authentic vintage or retro photography from the 1960s–1980s. Key features include warm, slightly faded analog tones, subtle film grain and light leaks, slightly desaturated highlights, a classic compositional framing, and an overall timeless, nostalgic mood.",
  },
};

export const QUALITY_BOILERPLATE_UNIVERSAL = `Award-winning composition, extremely detailed, professional visuals, high resolution.`;

export const QUALITY_BOILERPLATE_BY_STYLE = {
  cinematic: `Award-winning cinematic composition, anamorphic lens, film grain, professional color grading, 4K.`,
  anime: `High-quality anime illustration, 4K resolution, vibrant cel-shaded rendering, painterly backgrounds.`,
  "3d-render": `Cutting-edge 3D render, Octane/UE5 quality, ray-traced global illumination, hyper-realistic materials, 8K.`,
  "oil-painting": `Classical oil painting quality, rich pigment, visible brushstrokes, canvas texture, fine art masterpiece.`,
  "studio-commercial": `Professional studio photography, commercial lighting, high-end advertising quality, 8k, sharp focus.`,
  minimalist: `Award-winning minimal composition, crisp clarity, elegant negative space, professional graphic design quality.`,
  photorealistic: `Award-winning commercial photography, hyperrealistic, 8K raw photo, professional studio lighting, razor-sharp details.`,
  "flat-illustration": `Professional flat design illustration, bold geometric shapes, clean vector-like quality, modern graphic design.`,
  vintage: `Authentic vintage photography aesthetic, warm analog tones, subtle film grain, retro color palette, timeless composition.`,
};

export const EDIT_MODE_DIRECTIVES = {
  PRESERVATION_LAYER: `
    EDIT OPERATION — PRESERVATION MANDATE:
    - This is an EDIT of an existing image, NOT a new creation.
    - PRESERVE the overall composition, lighting direction, and spatial relationships between all subjects.
    - Do NOT recompose or restructure the scene.
    - Do NOT alter the color temperature, white balance, or tonal range of unchanged areas.
    - Do NOT add new subjects, objects, or background elements unless explicitly requested.
  `,
  // Used when NO mask is provided — changes are guided semantically by the brief
  SEMANTIC_EDIT_SCOPE_LAYER: `
    SEMANTIC CHANGE SCOPE (NO MASK):
    - Apply ONLY the modifications described in the user brief.
    - Identify the target elements semantically from the brief and treat everything else as READ-ONLY.
    - Do NOT alter untargeted subjects, background areas, colors, or lighting that are not described in the brief.
    - Changes may span the full image surface but only where semantically implied by the requested modification.
  `,
  // Used when a mask IS provided — pixel-level confinement to the masked region
  INPAINTING_SCOPE_LAYER: `
    INPAINTING SCOPE (MASK PROVIDED):
    - A mask defines the EXACT pixel region authorized for modification.
    - ALL changes MUST be strictly confined within the masked region. Zero tolerance for edits outside it.
    - Pixels outside the masked region MUST remain pixel-perfect identical to the original — do NOT alter them under any circumstance.
    - At the mask boundary: blend the edited region seamlessly by matching the surrounding grain, sharpness, color temperature, and lighting of the original image.
    - Do NOT introduce new subjects, objects, or compositional elements outside the mask.
  `,
  OUTPUT_INTEGRITY_LAYER: `
    OUTPUT INTEGRITY:
    - The output MUST be recognizably derived from the input image.
    - Maximum allowable change is ~30% of the total pixel area unless the brief says "complete restyle" or "full transformation".
    - Prioritize faithful execution of the stated change over creative interpretation.
  `,
};

export const SYSTEM_INSTRUCTIONS = {
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
    "font",
    "blurred text",
    "warped letters",
    "double exposure",
    "logo",
    // Generic quality negatives
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
