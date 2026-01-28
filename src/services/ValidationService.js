/**
 * Servicio de Validación de Entradas.
 * Utiliza PatternBuilder de Nicola para validaciones de formato.
 * Agregadas validaciones para generación de imágenes.
 */

import { PatternBuilder } from 'nicola-framework';
import { PROMPT_CONFIG, ERROR_CODES } from './promptConstants.js';
import { IMAGE_GEN_CONFIG } from '../config/imageGenConstants.js';

// Clase personalizada para errores de validación
export class ValidationError extends Error {
    constructor(message, statusCode = 400) {
        super(message);
        this.name = 'ValidationError';
        this.statusCode = statusCode;
        this.code = ERROR_CODES.VALIDATION_ERROR;
    }
}

class ValidationService {
    constructor() {
        this._initPatterns();
    }

    _initPatterns() {
        // Patrón para dimensiones (Legacy para Tarea 1): DIGITOS + "x" + DIGITOS
        this.dimensionsPattern = new PatternBuilder()
            .startOfLine()
            .digit().oneOrMore() // Ancho
            .find('x')           // Separador
            .digit().oneOrMore() // Alto
            .endOfLine();
    }

    /**
     * Valida y sanitiza el request completo para la generación de prompts.
     * @param {Object} body - Body del request
     * @param {Object} user - Usuario autenticado (para extraer brandId)
     * @returns {Object} Datos validados y limpios
     */
    validateRequest(body, user) {
        const { brief, style, dimensions, variations } = body;

        // 1. Validar Autenticación y BrandId
        if (!user || !user.userId) {
            throw new ValidationError("Usuario no autenticado o sesión inválida.", 401);
        }

        // 2. Validar Brief (Obligatorio y longitud)
        const cleanBrief = this.sanitizeInput(brief);
        this.validateBrief(cleanBrief);

        // 3. Validar Estilo (Opcional, debe estar en lista permitida)
        let validatedStyle = 'corporate'; // Default
        if (style) {
            if (!PROMPT_CONFIG.STYLES.includes(style)) {
                throw new ValidationError(`Estilo '${style}' no válido. Permitidos: ${PROMPT_CONFIG.STYLES.join(', ')}`);
            }
            validatedStyle = style;
        }

        // 4. Validar Dimensiones (Opcional)
        let validatedDimensions = '1024x1024'; // Default
        if (dimensions) {
            this.validateDimensions(dimensions);
            validatedDimensions = dimensions;
        }

        // 5. Validar Variaciones (Nuevo en Fase 2)
        let validatedVariations = PROMPT_CONFIG.VALIDATION.VARIATIONS.DEFAULT;
        if (variations !== undefined) {
            this.validateVariations(variations);
            validatedVariations = parseInt(variations, 10);
        }

        return {
            brief: cleanBrief,
            style: validatedStyle,
            dimensions: validatedDimensions,
            variations: validatedVariations,
            brandId: user.userId // Usar userId del JWT payload
        };
    }

    /**
     * [NUEVO] Valida request para GENERACIÓN DE IMÁGENES (Tarea 2)
     * @param {Object} body 
     */
    validateImageGenerationRequest(body) {
        const { prompt, aspectRatio, sampleCount, campaignId, style } = body;

        // 1. Validar Prompt (Obligatorio)
        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            throw new ValidationError("El campo 'prompt' es obligatorio para generar imágenes.");
        }

        // 2. Validar Aspect Ratio
        // Debe coincidir con los valores permitidos en IMAGE_GEN_CONFIG (ej: '16:9', '1:1')
        const allowedRatios = Object.values(IMAGE_GEN_CONFIG.ASPECT_RATIOS);
        const validRatio = aspectRatio || IMAGE_GEN_CONFIG.DEFAULTS.aspectRatio;

        if (!allowedRatios.includes(validRatio)) {
            throw new ValidationError(`Aspect Ratio '${aspectRatio}' no soportado. Permitidos: ${allowedRatios.join(', ')}`);
        }

        // 3. Validar Sample Count (Cantidad de imágenes)
        let validCount = sampleCount || IMAGE_GEN_CONFIG.DEFAULTS.sampleCount;
        const { MIN_SAMPLE_COUNT, MAX_SAMPLE_COUNT } = IMAGE_GEN_CONFIG.LIMITS;

        validCount = Number(validCount);
        if (isNaN(validCount) || validCount < MIN_SAMPLE_COUNT || validCount > MAX_SAMPLE_COUNT) {
            throw new ValidationError(`Sample Count inválido. Debe ser entre ${MIN_SAMPLE_COUNT} y ${MAX_SAMPLE_COUNT}.`);
        }

        // 4. Validad Campaign ID 
        let validCampaignId = campaignId ? this.sanitizeInput(campaignId) : undefined;

        // 5. Validar Estilo (Opcional)
        let validatedStyle = 'corporate'; // Default
        if (style) {
            if (!PROMPT_CONFIG.STYLES.includes(style)) {
                // Opción: lanzar error o fallback. Lanzamos error para consistencia.
                throw new ValidationError(`Estilo '${style}' no válido. Permitidos: ${PROMPT_CONFIG.STYLES.join(', ')}`);
            }
            validatedStyle = style;
        }

        return {
            prompt: this.sanitizeInput(prompt),
            aspectRatio: validRatio,
            sampleCount: validCount,
            campaignId: validCampaignId,
            style: validatedStyle
        };
    }

    /**
     * Valida reglas específicas del brief.
     * @param {string} brief 
     */
    validateBrief(brief) {
        if (!brief || typeof brief !== 'string' || brief.trim().length === 0) {
            throw new ValidationError("El brief es obligatorio y debe ser texto.");
        }

        if (brief.length < PROMPT_CONFIG.VALIDATION.MIN_BRIEF_LENGTH) {
            throw new ValidationError(`El brief es muy corto (${brief.length} chars). Mínimo requerido: ${PROMPT_CONFIG.VALIDATION.MIN_BRIEF_LENGTH} caracteres.`);
        }

        if (brief.length > PROMPT_CONFIG.VALIDATION.MAX_BRIEF_LENGTH) {
            throw new ValidationError(`El brief excede el límite de ${PROMPT_CONFIG.VALIDATION.MAX_BRIEF_LENGTH} caracteres.`);
        }
    }

    /**
     * Valida el formato de dimensiones usando PatternBuilder.
     * @param {string} dimensions - Ej: "1920x1080"
     */
    validateDimensions(dimensions) {
        if (typeof dimensions !== 'string' || !this.dimensionsPattern.matches(dimensions)) {
            throw new ValidationError("Formato de dimensiones inválido. Use formato ANCHOxALTO (ej: 1920x1080)");
        }

        // Validación extra: asegurar que no sean dimensiones absurdas (ej: 0x0)
        const [w, h] = dimensions.split('x').map(Number);
        if (w <= 0 || h <= 0) {
            throw new ValidationError("Las dimensiones deben ser mayores a 0.");
        }
    }

    /**
     * Valida el número de variaciones solicitadas.
     * @param {number|string} variations 
     */
    validateVariations(variations) {
        const num = Number(variations);
        if (isNaN(num) || !Number.isInteger(num)) {
            throw new ValidationError("El número de variaciones debe ser un entero.");
        }

        const { MIN, MAX } = PROMPT_CONFIG.VALIDATION.VARIATIONS;
        if (num < MIN || num > MAX) {
            throw new ValidationError(`Las variaciones deben estar entre ${MIN} y ${MAX}.`);
        }
    }

    /**
     * Limpia la entrada de caracteres peligrosos, HTML tags o espacios extra.
     * @param {string} input 
     * @returns {string}
     */
    sanitizeInput(input) {
        if (!input) return '';
        if (typeof input !== 'string') return String(input);

        return input
            .trim()
            .replace(/<[^>]*>?/gm, '') // Eliminar etiquetas HTML básicas por seguridad
            .replace(/[\u0000-\u001F\u007F-\u009F]/g, ""); // Eliminar caracteres de control
    }
}

export default new ValidationService();