// src/domain/services/prompt/PromptBuilder.js
import { SYSTEM_INSTRUCTIONS, STYLE_DEFINITIONS, BRAND_ENFORCEMENT } from "./promptConstants.js";
import { BrandSanitizer } from "./BrandSanitizer.js";

/**
 * Servicio encargado de ensamblar el prompt final.
 * Fusión de System Instructions + Contexto RAG + Brief Usuario + Modificadores.
 * Implementación optimizada con Jerarquía de Atención y Sanitización.
 * Enfoque "Híbrido" -> Prepara el lienzo para el estampado posterior del logo.
 */
class PromptBuilder {
  constructor() {
    this.qualityBoilerplate = SYSTEM_INSTRUCTIONS.BASE;
  }

  /**
   * Construye el prompt final optimizado.
   * @param {Object} params
   * @param {string} params.brief - Brief enriquecido (Ancla)
   * @param {Object} params.context - Contexto RAG crudo
   * @param {string} params.style - Estilo visual
   * @param {string} params.dimensions - Dimensiones
   */
  build({ brief, context, style, dimensions }) {
    // A. SANITIZACIÓN (El Filtro Quirúrgico de RAG)
    const cleanBrand = BrandSanitizer.clean(context);

    const parts = [];

    // 0. Preparar Estilo
    const { stylePrefix, styleSuffix } = this.getStyleComponents(style);

    // ---------------------------------------------------------
    // CAPA 1: SUJETO (El Ancla)
    // ---------------------------------------------------------
    if (stylePrefix) parts.push(stylePrefix);
    parts.push(brief);

    // ---------------------------------------------------------
    // CAPA 2: REGLAS DE MARCA (Forzadas - NUEVO)
    // ---------------------------------------------------------
    parts.push(BRAND_ENFORCEMENT.ATMOSPHERE_RULE);
    parts.push(BRAND_ENFORCEMENT.COMPOSITION_RULE);

    // ---------------------------------------------------------
    // CAPA 3: CONTEXTO DE MARCA (Sanitizado)
    // ---------------------------------------------------------
    if (cleanBrand) {
      // Inyectamos colores solo si existen (como acentos secundarios)
      if (cleanBrand.colors && cleanBrand.colors.length > 0) {
        parts.push(`Secondary Palette Accents: ${cleanBrand.colors.join(", ")}`);
      }
      // Forzamos entorno si el sanitizer lo dicta
      if (cleanBrand.environment) {
        parts.push(`Background/Environment: ${cleanBrand.environment}`);
      }
    }

    // ---------------------------------------------------------
    // CAPA 4: CALIDAD Y TÉCNICA (Boilerplate)
    // ---------------------------------------------------------
    parts.push(this.qualityBoilerplate);

    if (styleSuffix) parts.push(styleSuffix);

    if (dimensions) {
      parts.push(`Aspect Ratio: ${dimensions}`);
    }

    // ---------------------------------------------------------
    // CAPA 5: NEGATIVOS (Dinámicos - Realism Shield + Text Shield)
    // ---------------------------------------------------------
    let negatives = SYSTEM_INSTRUCTIONS.NEGATIVE_PROMPT_DEFAULT || [];

    // CRÍTICO: Prohibimos "texto" y "logos" para que la IA no intente dibujarlos mal.
    const textShield = [
      "text", "typography", "letters", "words", "watermark",
      "signature", "logo", "brand name", "writing", "font",
      "blurred text", "warped letters", "double exposure"
    ];
    negatives = [...negatives, ...textShield];

    // Si el sanitizer detectó "Tech", activamos el escudo Anti-Holograma
    if (cleanBrand && cleanBrand.requiresRealismShield) {
      const shieldNegatives = [
        "holograms",
        "futuristic ui",
        "floating data",
        "blue glow",
        "cyborgs",
        "sci-fi elements",
        "flying numbers",
        "matrix code",
        "virtual reality goggles",
        "circuits on face",
      ];
      negatives = [...negatives, ...shieldNegatives];
    }

    // Unir negativos únicos
    const uniqueNegatives = [...new Set(negatives)].join(", ");

    // Retorno: Prompt Positivo separada por comas + Negativos
    return `${parts.join("\n")}\n\n--no ${uniqueNegatives}`;
  }

  /**
   * Extrae componentes de estilo (Prefix/Suffix)
   */
  getStyleComponents(style) {
    const def = STYLE_DEFINITIONS[style];
    if (def) {
      return {
        stylePrefix: def.prefix || "",
        styleSuffix: def.suffix || "",
      };
    }
    return { stylePrefix: "", styleSuffix: style || "" };
  }
}

export default new PromptBuilder();
