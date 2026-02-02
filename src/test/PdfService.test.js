import { jest } from '@jest/globals';

// 1. MOCK createRequire & pdf-parse
// Since the code uses createRequire, we mock 'node:module' to return a mocked require function
const mockGetText = jest.fn();
const MockPDFParseClass = jest.fn(() => ({
    getText: mockGetText
}));

const mockRequire = jest.fn((moduleName) => {
    if (moduleName === 'pdf-parse') {
        return { PDFParse: MockPDFParseClass };
    }
    return {};
});

jest.unstable_mockModule('node:module', () => ({
    createRequire: jest.fn(() => mockRequire)
}));

// 2. IMPORT SERVICE
const { extractTextFromPdf } = await import('../services/PdfService.js');

// 3. SUITE
describe('PdfService', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('Debe extraer texto exitosamente', async () => {
        const mockBuffer = Buffer.from('%PDF-1.4 ... data ...');

        mockGetText.mockResolvedValue({
            text: " Hola Mundo \n\0 ",
            total: 5,
            info: { Title: "T" }
        });

        const result = await extractTextFromPdf(mockBuffer);

        expect(result.fullText).toBe("Hola Mundo");
        expect(result.totalPages).toBe(5);
        expect(result.info).toEqual({});
        expect(MockPDFParseClass).toHaveBeenCalledTimes(1);
    });

    test('Debe fallar si no es un PDF válido (magic number)', async () => {
        const badBuffer = Buffer.from('NOT_PDF');

        await expect(extractTextFromPdf(badBuffer))
            .rejects.toThrow("Invalid PDF file");
    });

    test('Debe manejar errores de parseo', async () => {
        const mockBuffer = Buffer.from('%PDF-Fail');
        mockGetText.mockRejectedValue(new Error("Parse Fail"));

        await expect(extractTextFromPdf(mockBuffer))
            .rejects.toThrow("Failed to extract text");
    });
});
