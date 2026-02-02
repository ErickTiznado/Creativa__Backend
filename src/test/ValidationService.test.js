import { jest } from '@jest/globals';

// 1. MOCK NICOLA FRAMEWORK
jest.unstable_mockModule('nicola-framework', () => ({
    PatternBuilder: jest.fn(() => ({
        startOfLine: jest.fn().mockReturnThis(),
        digit: jest.fn().mockReturnThis(),
        oneOrMore: jest.fn().mockReturnThis(),
        find: jest.fn().mockReturnThis(),
        endOfLine: jest.fn().mockReturnThis(),
        matches: jest.fn().mockReturnValue(true) // Default to true
    }))
}));

// 2. IMPORT SERVICE
const { default: ValidationService, ValidationError } = await import('../services/ValidationService.js');

// 3. SUITE
describe('ValidationService (ESM)', () => {

    describe('validateRequest (Prompt Gen)', () => {
        const validUser = { userId: 'u1' };
        // Valid brief > 50 chars
        const validBrief = "Este es un brief de prueba lo suficientemente largo para pasar la validación mínima de caracteres requerida por el sistema de configuración.";

        test('Debe validar request válido con defaults', () => {
            const body = { brief: validBrief };
            const result = ValidationService.validateRequest(body, validUser);

            expect(result.brief).toBe(validBrief);
            expect(result.style).toBe('corporate'); // Default
            expect(result.dimensions).toBe('1024x1024'); // Default (from ValidationService logic, defaulting if not provided)
            expect(result.brandId).toBe('u1');
        });

        test('Debe lanzar error si no hay usuario', () => {
            expect(() => {
                ValidationService.validateRequest({ brief: validBrief }, null);
            }).toThrow("Usuario no autenticado");
        });

        test('Debe lanzar error si brief es inválido', () => {
            expect(() => ValidationService.validateRequest({ brief: "" }, validUser)).toThrow();
            expect(() => ValidationService.validateRequest({ brief: 123 }, validUser)).toThrow();
            expect(() => ValidationService.validateRequest({ brief: "Corto" }, validUser)).toThrow("muy corto");
        });

        test('Debe validar estilo permitido', () => {
            const body = { brief: validBrief, style: "cinematic" };
            const result = ValidationService.validateRequest(body, validUser);
            expect(result.style).toBe('cinematic');
        });

        test('Debe lanzar error con estilo no permitido', () => {
            const body = { brief: validBrief, style: "INVALID_STYLE_XYZ" };
            expect(() => ValidationService.validateRequest(body, validUser)).toThrow("no válido");
        });

        test('Debe validar dimensiones custom', () => {
            const body = { brief: validBrief, dimensions: "1920x1080" };
            const result = ValidationService.validateRequest(body, validUser);
            expect(result.dimensions).toBe("1920x1080");
        });
    });

    describe('validateImageGenerationRequest', () => {
        test('Debe validar request válido', () => {
            const body = { prompt: "Foto", aspectRatio: "16:9", sampleCount: "2" };
            const result = ValidationService.validateImageGenerationRequest(body);

            expect(result.prompt).toBe("Foto");
            expect(result.aspectRatio).toBe("16:9");
            expect(result.sampleCount).toBe(2);
        });

        test('Debe lanzar error sin prompt', () => {
            expect(() => ValidationService.validateImageGenerationRequest({})).toThrow("obligatorio");
        });

        test('Debe lanzar error con aspect ratio inválido', () => {
            const body = { prompt: "P", aspectRatio: "100:100" }; // "100:100" is not in {SQUARE:'1:1', ...}
            expect(() => ValidationService.validateImageGenerationRequest(body)).toThrow("no soportado");
        });

        test('Debe validar rango de sampleCount', () => {
            const bodyTooLow = { prompt: "P", sampleCount: -1 };
            expect(() => ValidationService.validateImageGenerationRequest(bodyTooLow)).toThrow("inválido");

            const bodyTooHigh = { prompt: "P", sampleCount: 10 }; // Max is 4
            expect(() => ValidationService.validateImageGenerationRequest(bodyTooHigh)).toThrow("inválido");
        });
    });

    describe('sanitizeInput', () => {
        test('Debe limpiar HTML y espacios', () => {
            const input = "  <script>alert</script> Hola   ";
            const clean = ValidationService.sanitizeInput(input);
            expect(clean).toBe("alert Hola");
        });

        test('Debe manejar inputs no string', () => {
            expect(ValidationService.sanitizeInput(null)).toBe('');
            expect(ValidationService.sanitizeInput(123)).toBe('123');
        });
    });
});
