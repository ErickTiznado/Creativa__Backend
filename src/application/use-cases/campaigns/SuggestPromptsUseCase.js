import { PROMPT_CONFIG } from "../../../domain/services/prompt/promptConstants.js";

class SuggestPromptsUseCase {
    #campaignRepository;
    #textGenerationAdapter;

    constructor(campaignRepository, textGenerationAdapter) {
        this.#campaignRepository = campaignRepository;
        this.#textGenerationAdapter = textGenerationAdapter;
    }

    // Public method to generate suggestions directly from a brief object (no DB lookup)
    // Useful for generating suggestions during campaign creation before saving
    async generateForBrief(brief, options = {}) {
        return this.#generateSuggestions(brief, options);
    }

    async execute(campaignId, options = {}) {
        if (!campaignId) {
            throw new Error("campaignId is required.");
        }

        const campaign = await this.#campaignRepository.findById(campaignId);
        if (!campaign) {
            throw new Error(`Campaign not found: ${campaignId}`);
        }

        const brief = campaign.brief_data;
        if (!brief) {
            throw new Error("Campaign has no brief data.");
        }

        // OPTIMIZATION: If we already have stored AI config and no specific overrides are requested, return it.
        // We only reuse if the user isn't asking for a specific style change (options.style is empty or matches).
        if (brief.ai_config && brief.ai_config.prompts && !options.style && !options.aspectRatio) {
             console.log(`[SuggestPrompts] Returning cached suggestions for ${campaignId}`);
             return { ...brief.ai_config, campaignId, fromCache: true };
        }

        // Pass options but allow AI to override style if not explicitly forced by user
        const result = await this.#generateSuggestions(brief, options);
        
        // Optional: Update the campaign with these new suggestions so we cache them for next time?
        // Maybe only if it was a "default" generation. 
        // For now, let's just return them.
        
        return { ...result, campaignId };
    }

    async #generateSuggestions(brief, options) {
        const availableStyles = PROMPT_CONFIG.STYLES.join(", ");
        
        let systemPrompt = `Eres un experto director de arte para campañas de marketing.
Tu tarea es doble:
1. ANALIZAR el brief (público, objetivo, canal, producto) y SELECCIONAR el estilo visual más adecuado de esta lista estricta: [${availableStyles}].
2. GENERAR 5 prompts visuales coherentes con ese estilo seleccionado.

Reglas de Salida:
- Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional ni markdown.
- El campo "reasoning" debe ser máximo 2 oraciones cortas.
- Cada prompt máximo 200 caracteres, concisos y técnicos.
- Si el usuario definió un aspectRatio (${options.aspectRatio || "cualquiera"}), menciónalo al final del prompt.

Formato:
{
  "recommendedStyle": "nombre_del_estilo",
  "reasoning": "Razón breve.",
  "prompts": ["prompt 1", "prompt 2", "prompt 3", "prompt 4", "prompt 5"]
}`;

        // If user explicitly requests a style in options (e.g. from UI selector), we force it via system prompt instructions,
        // BUT we still ask the AI to return it in the JSON structure for consistency.
        if (options.style) {
            systemPrompt += `\n\nNOTA IMPORTANTE: El usuario ha PRE-SELECCIONADO el estilo "${options.style}". Debes usar ese estilo obligatoriamente en "recommendedStyle" y en la generación de prompts.`;
        }

        const userPrompt = this.#buildBriefContext(brief);

        const rawResponse = await this.#textGenerationAdapter.generateText(systemPrompt, userPrompt);

        return this.#parseResponse(rawResponse);
    }

    #buildBriefContext(brief) {
        const fields = [
            brief.nombre_campaing && `Nombre: ${brief.nombre_campaing}`,
            brief.Description && `Descripción: ${brief.Description}`,
            brief.Objective && `Objetivo: ${brief.Objective}`,
            brief.publishing_channel && `Canal: ${brief.publishing_channel}`,
            brief.target_audience && `Público Objetivo: ${brief.target_audience}`, // Added target audience if available
            brief.public && `Público: ${brief.public}`, // Alternative field name
            brief.company && `Empresa: ${brief.company}`, // Added company if available
            brief.observations && `Observaciones: ${brief.observations}`,
        ].filter(Boolean);

        return `Brief de Campaña:\n${fields.join("\n")}`;
    }

    #parseResponse(rawText) {
        // 1. First cleanup: Remove markdown code blocks
        let cleaned = rawText
            .replace(/```json\s*/gi, "")
            .replace(/```\s*/gi, "")
            .trim();

        // 2. Extract JSON object if there is extra text
        const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            cleaned = jsonMatch[0];
        }

        try {
            const parsed = JSON.parse(cleaned);
            
            // Validate structure
            if (parsed.recommendedStyle && Array.isArray(parsed.prompts)) {
                return {
                    recommendedStyle: parsed.recommendedStyle,
                    reasoning: parsed.reasoning || "",
                    prompts: parsed.prompts.slice(0, 5)
                };
            }
            
            // Fallback for array response (backward compatibility logic)
            if (Array.isArray(parsed)) {
                return {
                    recommendedStyle: "cinematic", // Default fallback
                    prompts: parsed.slice(0, 5)
                };
            }
        } catch (e) {
            console.error("Failed to parse AI response. Raw text:", rawText);
            console.error("Parse error:", e.message);
        }

        // Ultimate fallback — marked so the controller does NOT persist it
        return {
            recommendedStyle: "cinematic",
            prompts: ["High quality marketing image", "Professional studio shot", "Creative composition"],
            isFallback: true
        };
    }
}

export default SuggestPromptsUseCase;
