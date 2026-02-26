// src/domain/services/prompt/PromptBuilder.js
import {
  SYSTEM_INSTRUCTIONS,
  STYLE_DEFINITIONS,
  BRAND_ENFORCEMENT,
  QUALITY_BOILERPLATE_BY_STYLE,
  QUALITY_BOILERPLATE_UNIVERSAL,
  EDIT_MODE_DIRECTIVES,
} from "./promptConstants.js";
import { BrandSanitizer } from "./BrandSanitizer.js";

/**
 * Servicio encargado de ensamblar el prompt final.
 * Fusión de System Instructions + Contexto RAG + Brief Usuario + Modificadores.
 * Implementación optimizada con Jerarquía de Atención y Sanitización.
 * Soporta dos modos: 'generate' (creación desde cero) y 'edit' (modificación quirúrgica).
 */
class PromptBuilder {
  /**
   * Construye el prompt final optimizado.
   * @param {Object} params
   * @param {string} params.brief - Brief enriquecido (Ancla)
   * @param {Object} params.context - Contexto RAG crudo
   * @param {string} params.style - Estilo visual
   * @param {string} [params.mode='generate'] - Modo de operación: 'generate' o 'edit'
   * @param {boolean} [params.hasMask=false] - Si hay máscara de inpainting (solo relevante en modo 'edit')
   */
  build({ brief, context, style, mode = 'generate', hasMask = false }) {
    // A. SANITIZACIÓN (El Filtro Quirúrgico de RAG)
    const cleanBrand = BrandSanitizer.clean(context);

    const parts = [];

    // 0. Preparar Estilo
    const predefinedStyleDescription = this.getStyleComponents(style);

    // ---------------------------------------------------------
    // CAPA 1: SUJETO (El Ancla)
    // ---------------------------------------------------------
    parts.push(brief);

    // ---------------------------------------------------------
    // CAPA 1.1: DIRECTIVAS DE EDICIÓN (solo en modo edit)
    // ---------------------------------------------------------
    if (mode === 'edit') {
      parts.push(EDIT_MODE_DIRECTIVES.PRESERVATION_LAYER);
      parts.push(
        hasMask
          ? EDIT_MODE_DIRECTIVES.INPAINTING_SCOPE_LAYER
          : EDIT_MODE_DIRECTIVES.SEMANTIC_EDIT_SCOPE_LAYER
      );
      parts.push(EDIT_MODE_DIRECTIVES.OUTPUT_INTEGRITY_LAYER);
    }

    // ---------------------------------------------------------
    // CAPA 1.5: DESCRIPCIÓN DE ESTILO PERSONALIZADA
    // ---------------------------------------------------------
    if (predefinedStyleDescription) {
      parts.push(`OVERALL VISUAL STYLE & AESTHETIC DIRECTIVE:\n- The following stylistic description must dictate the mood, colors, and overall visual delivery of the image:\n"${predefinedStyleDescription}"\n- Ensure the image strictly adheres to this aesthetic.`);
    }

    // ---------------------------------------------------------
    // CAPA 2: REGLAS DE MARCA (solo si hay contexto de marca)
    // ---------------------------------------------------------
    if (cleanBrand) {
      parts.push(BRAND_ENFORCEMENT.ATMOSPHERE_RULE);
      parts.push(BRAND_ENFORCEMENT.COMPOSITION_RULE);
    }

    // ---------------------------------------------------------
    // CAPA 3: CONTEXTO DE MARCA (Sanitizado)
    // ---------------------------------------------------------
    if (cleanBrand) {
      if (cleanBrand.colors && cleanBrand.colors.length > 0) {
        parts.push(`Secondary Palette Accents: ${cleanBrand.colors.join(", ")}`);
      }
      if (cleanBrand.environment) {
        parts.push(`Background/Environment: ${cleanBrand.environment}`);
      }
    }

    // ---------------------------------------------------------
    // CAPA 4: CALIDAD Y TÉCNICA (específica por estilo)
    // ---------------------------------------------------------
    const normalizedStyle = style ? style.toLowerCase().replace(/\s+/g, '-') : null;
    const boilerplate = QUALITY_BOILERPLATE_BY_STYLE[normalizedStyle] || QUALITY_BOILERPLATE_UNIVERSAL;
    parts.push(boilerplate);

    // ---------------------------------------------------------
    // CAPA 5: NEGATIVOS (Dinámicos - Realism Shield)
    // ---------------------------------------------------------
    let negatives = [...SYSTEM_INSTRUCTIONS.NEGATIVE_PROMPT_DEFAULT];

    if (cleanBrand && cleanBrand.requiresRealismShield) {
      negatives.push(
        "holograms", "futuristic ui", "floating data", "blue glow", "cyborgs",
        "sci-fi elements", "flying numbers", "matrix code", "virtual reality goggles", "circuits on face"
      );
    }

    const uniqueNegatives = [...new Set(negatives)].join(", ");

    return `${parts.join("\n")}\n\n--no ${uniqueNegatives}`;
  }

  /**
   * Extrae la descripción de estilo.
   */
  getStyleComponents(style) {
    if (!style) return "";

    const normalizedStyle = style.toLowerCase().replace(/\s+/g, '-');
    const def = STYLE_DEFINITIONS[normalizedStyle] || STYLE_DEFINITIONS[style];

    if (def) {
      return def.description || "";
    }
    return style || "";
  }
}

export default new PromptBuilder();
