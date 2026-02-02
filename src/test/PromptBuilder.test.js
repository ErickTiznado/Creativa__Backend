import { jest } from '@jest/globals';

// 1. IMPORT SERVICE (Real implementation, no mocks of internal constants to verify integration)
const { default: PromptBuilder } = await import('../services/PromptBuilder.js');
const { SYSTEM_INSTRUCTIONS } = await import('../services/promptConstants.js');

// 2. SUITE
describe('PromptBuilder Integration (ESM)', () => {

    const mockBrief = "Un perro astronauta";

    test('Debe construir prompt básico (Brief + Boilerplate + Negatives)', () => {
        const result = PromptBuilder.build({ brief: mockBrief });

        // Expected structure: "brief, boilerplate\n\n--no negatives"
        // (If style is empty, prefix/suffix might be empty)

        expect(result).toContain(mockBrief);
        expect(result).toContain(SYSTEM_INSTRUCTIONS.BASE);
        expect(result).toContain("--no");
        // Should NOT have color palette if no context
        expect(result).not.toContain("Color Palette:");
    });

    test('Debe extraer colores del contexto (BrandSanitizer Integration)', () => {
        const contextWithColors = {
            data: "Nuestra marca usa el color #FF0000 y tambien el #0000FF."
        };

        const result = PromptBuilder.build({ brief: mockBrief, context: contextWithColors });

        expect(result).toContain("Color Palette: #FF0000, #0000FF");
        expect(result).toContain("Lighting: Natural lighting with subtle accents in #FF0000");
    });

    test('Debe activar Realism Shield para contextos tecnológicos', () => {
        const contextTech = {
            data: "Somos una empresa de tecnología y software."
        };

        const result = PromptBuilder.build({ brief: mockBrief, context: contextTech });

        // Environment forced
        expect(result).toContain("Background/Environment: Modern clean office environment");

        // Shield negatives
        expect(result).toContain("holograms");
        expect(result).toContain("futuristic ui");
        expect(result).toContain("blue glow");
    });

    test('Debe aplicar estilos (Prefix/Suffix)', () => {
        // "cinematic" uses "Cinematic shot of" prefix
        const result = PromptBuilder.build({ brief: mockBrief, style: "cinematic" });

        expect(result).toContain("Cinematic shot of");
        expect(result).toContain("dramatic lighting"); // part of cinematic suffix
    });

    test('Debe manejar dimensiones', () => {
        const result = PromptBuilder.build({ brief: mockBrief, dimensions: "16:9" });
        expect(result).toContain("Aspect Ratio: 16:9");
    });

    test('Debe incluir escudo anti-texto explícitamente', () => {
        const result = PromptBuilder.build({ brief: mockBrief });
        expect(result).toContain("text");
        expect(result).toContain("typography");
        expect(result).toContain("watermark");
    });
});
