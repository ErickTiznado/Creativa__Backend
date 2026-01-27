/**
 * Servicio encargado de ensamblar el prompt final.
 * Fusión de System Instructions + Contexto RAG + Brief Usuario + Modificadores.
 * Implementación completa de la lógica de construcción.
 */

import { SYSTEM_INSTRUCTIONS, STYLE_DEFINITIONS } from './promptConstants.js';

class PromptBuilder {
    constructor() {
        this.baseSystemInstructions = SYSTEM_INSTRUCTIONS.BASE;
    }

    /**
     * Construye el prompt final optimizado.
     * @param {Object} params - Parámetros validados
     * @param {string} params.brief - Brief del usuario (puede venir mejorado)
     * @param {Object} params.context - Contexto obtenido del RAG o Fallback
     * @param {string} params.style - Estilo visual seleccionado
     * @param {string} params.dimensions - Dimensiones técnicas
     * @returns {string} Prompt final formateado
     */
    build({ brief, context, style, dimensions }) {
        const sections = [];

        // 1. System Instructions (Rol y Objetivo)
        sections.push(this.baseSystemInstructions);

        // 2. Contexto de Marca (RAG o Fallback)
        // Usamos la misma lógica para ambos casos ya que la estructura de datos está normalizada
        if (context && context.data) {
            sections.push(this.buildBrandContext(context.data));
        }

        // 3. Brief del Usuario (El núcleo de la solicitud)
        sections.push(`\nDESCRIPCIÓN DE LA IMAGEN:\n${brief}`);

        // 4. Modificadores de Estilo (Dirección artística)
        if (style) {
            sections.push(this.buildStyleModifiers(style));
        }

        // 5. Especificaciones Técnicas (Dimensiones)
        if (dimensions) {
            sections.push(`\nESPECIFICACIONES TÉCNICAS:\nDimensiones: ${dimensions}`);
        }

        // 6. Negative Prompts (Restricciones)
        sections.push(this.buildNegativePrompts());

        // Unir todas las secciones con doble salto de línea para claridad
        return sections.join('\n\n');
    }

    /**
     * Formatea el contexto de marca proveniente del RAG o Fallback.
     * Convierte el objeto JSON en instrucciones legibles para el LLM.
     * @param {Object} brandData - Datos de marca normalizados
     */
    buildBrandContext(brandData) {
        const lines = ['\nCONTEXTO DE MARCA Y DIRECTRICES:'];

        // Colores
        if (brandData.colors) {
            const { primary, secondary, accent } = brandData.colors;
            const colorsList = [primary, secondary, accent].filter(Boolean).join(', ');
            lines.push(`- Color Palette: ${colorsList}`);
        }

        // Tipografía
        if (brandData.typography) {
            const { heading, body } = brandData.typography;
            if (heading || body) {
                lines.push(`- Typography: ${heading || ''} (Headings), ${body || ''} (Body)`);
            }
        }

        // Estilo Visual y Tono
        if (brandData.visualStyle) {
            lines.push(`- Visual Style: ${brandData.visualStyle}`);
        }
        if (brandData.tone) {
            lines.push(`- Tone of Voice/Image: ${brandData.tone}`);
        }

        // Reglas específicas (Guidelines)
        if (brandData.guidelines && Array.isArray(brandData.guidelines) && brandData.guidelines.length > 0) {
            lines.push('- Reglas específicas:');
            brandData.guidelines.forEach(rule => {
                lines.push(`  * ${rule}`);
            });
        } else if (brandData.relevantRules && Array.isArray(brandData.relevantRules)) {
            // Soporte para estructura alternativa si viene como relevantRules
            lines.push('- Reglas específicas:');
            brandData.relevantRules.forEach(rule => {
                lines.push(`  * ${rule}`);
            });
        }

        return lines.join('\n');
    }

    /**
     * Genera la sección de modificadores de estilo basada en el mapa de definiciones.
     * @param {string} style - Key del estilo (ej: 'cinematic')
     */
    buildStyleModifiers(style) {
        const description = STYLE_DEFINITIONS[style] || style;
        return `\nDIRECCIÓN DE ESTILO:\n${description}`;
    }

    /**
     * Agrega los negative prompts globales.
     */
    buildNegativePrompts() {
        const negatives = SYSTEM_INSTRUCTIONS.NEGATIVE_PROMPT_DEFAULT.join(", ");
        return `\nPROHIBIDO:\n${negatives}`;
    }
}

export default new PromptBuilder();