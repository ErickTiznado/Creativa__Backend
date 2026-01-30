/**
 * Servicio encargado de ensamblar el prompt final.
 * Fusión de System Instructions + Contexto RAG + Brief Usuario + Modificadores.
 * Implementación optimizada con Jerarquía de Atención (Sandwich Structure) y Sanitización Anti-Alucinaciones.
 */

import { SYSTEM_INSTRUCTIONS, STYLE_DEFINITIONS } from "./promptConstants.js";
import { BrandSanitizer } from "./BrandSanitizer.js";

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
    // CAPA 2: CONTEXTO DE MARCA (Sanitizado)
    // ---------------------------------------------------------
    if (cleanBrand) {
      // Inyectamos colores solo si existen
      if (cleanBrand.colors && cleanBrand.colors.length > 0) {
        parts.push(`Color Palette: ${cleanBrand.colors.join(", ")}`);
        // Sugerencia sutil de iluminación con el color primario
        parts.push(
          `Lighting: Natural lighting with subtle accents in ${cleanBrand.colors[0]}`,
        );
      }
      // Forzamos entorno si el sanitizer lo dicta (ej: "Modern clean office")
      if (cleanBrand.environment) {
        parts.push(`Background/Environment: ${cleanBrand.environment}`);
      }
    }

    // ---------------------------------------------------------
    // CAPA 3: CALIDAD Y TÉCNICA (Boilerplate)
    // ---------------------------------------------------------
    parts.push(this.qualityBoilerplate);

    if (styleSuffix) parts.push(styleSuffix);

    if (dimensions) {
      parts.push(`Aspect Ratio: ${dimensions}`);
    }

    // ---------------------------------------------------------
    // CAPA 4: NEGATIVOS (Dinámicos - Realism Shield)
    // ---------------------------------------------------------
    let negatives = SYSTEM_INSTRUCTIONS.NEGATIVE_PROMPT_DEFAULT;

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

    // ---------------------------------------------------------
    // CAPA 5: ESCUDO ANTI-TEXTO (Política de Pureza Visual)
    // ---------------------------------------------------------
    // Refuerzo explícito para garantizar que no haya texto, según solicitud del usuario.
    const textShield = ["text", "typography", "letters", "words", "watermark"];
    negatives = [...negatives, ...textShield];

    // Unir negativos únicos
    const uniqueNegatives = [...new Set(negatives)].join(", ");

    // Retorno: Prompt Positivo separada por comas + Negativos
    return `${parts.join(", ")}\n\n--no ${uniqueNegatives}`;
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
