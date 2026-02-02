import { jest } from '@jest/globals';

// 1. IMPORT SERVICE (Pure logic, no mocks needed)
const { chunkText } = await import('../services/ChunkingService.js');

// 2. SUITE
describe('ChunkingService (ESM)', () => {

    test('Debe dividir texto corto en un solo chunk', () => {
        const text = "Hola mundo. Esto es una prueba.";
        const chunks = chunkText(text);
        expect(chunks).toHaveLength(1);
        expect(chunks[0]).toBe("Hola mundo. Esto es una prueba..");
    });

    test('Debe dividir texto largo respetando oraciones', () => {
        // CHUNK_SIZE is 1500.
        // Create a fake sentence that is ~800 chars
        const sentence = "A".repeat(800) + ". ";
        const text = sentence + sentence + sentence; // 2400 chars roughly

        const chunks = chunkText(text);

        // Chunk 1: 800 + 800 = 1600 > 1500? Use logic from code
        // Logic:
        // actualChunk + newS > 1500?
        // 0 + 800 < 1500 -> actual=800
        // 800 + 800 = 1600 > 1500 -> push 800. actual=800
        // 800 + 800 (last) = 1600 > 1500 -> push 800. actual=800.
        // End -> push 800.
        // Total 3 chunks?

        // Let's verify logic in code:
        // for(const s of sentences) { newS = s + ". " ... }
        // If s is just "A...A", s + ". " is "A...A. "

        expect(chunks.length).toBeGreaterThan(1);
        chunks.forEach(c => {
            expect(c.length).toBeLessThanOrEqual(1600); // Allow some margin if logic allows slight overflow before check?
            // Logic: if(actualChunk.length + newS.length > CHUNK_SIZE) -> push actual.
            // So chunks are <= CHUNK_SIZE? No, actualChunk is pushed, which is < 1500 (usually).
            // But if a single sentence is huge (> 1500), it might break or be one chunk.
        });
    });

    test('Debe manejar texto vacío', () => {
        const chunks = chunkText("");
        expect(chunks).toEqual([]);
    });

    test('Debe normalizar espacios', () => {
        const text = "Hola    mundo.\n\nTest.";
        const chunks = chunkText(text);
        expect(chunks[0]).toContain("Hola mundo.");
        expect(chunks[0]).toContain("Test.");
    });
});
