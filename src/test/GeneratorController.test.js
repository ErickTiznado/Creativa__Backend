import { jest } from '@jest/globals';

// --- variables de control para Mocks Dinámicos ---
let mockGeminiResponse;
const mockSharpResize = jest.fn().mockReturnThis();

// 1. MOCKS DE DEPENDENCIAS (Antes de importar el controlador)
jest.unstable_mockModule('../model/CampaignAsset.js', () => ({
    default: {
        create: jest.fn(),
        where: jest.fn().mockReturnThis(),
        get: jest.fn()
    }
}));

jest.unstable_mockModule('sharp', () => ({
    default: jest.fn(() => ({
        metadata: jest.fn().mockResolvedValue({ format: 'png' }),
        resize: mockSharpResize, // Usamos la variable para rastrear llamadas
        toFormat: jest.fn().mockReturnThis(),
        toBuffer: jest.fn().mockResolvedValue(Buffer.from('fake-buffer'))
    }))
}));

jest.unstable_mockModule('axios', () => ({
    default: {
        get: jest.fn().mockResolvedValue({ data: Buffer.from('fake-img') })
    }
}));

jest.unstable_mockModule('@google-cloud/vertexai', () => ({
    VertexAI: jest.fn().mockImplementation(() => ({
        preview: {
            getGenerativeModel: jest.fn().mockReturnValue({
                generateContent: jest.fn().mockImplementation(() => Promise.resolve(mockGeminiResponse))
            })
        }
    }))
}));

// Importaciones después de los mocks
const { saveToStorage, refineAsset } = await import('../controllers/GeneratorController.js');
const CampaignAsset = (await import('../model/CampaignAsset.js')).default;

describe('GeneratorController - Suite Completa Corregida', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        res = {
            statusCode: 200,
            json: jest.fn().mockReturnThis(),
            status: jest.fn().mockReturnThis()
        };
    });

    describe('saveToStorage', () => {
        test('Debe guardar exitosamente y verificar redimensión de thumbnail', async () => {
            req = {
                body: { campaignId: "CAMP-001", prompt: "Logo creativo" },
                files: { images: [{ data: Buffer.from('original'), name: 'test.png' }] }
            };
            CampaignAsset.create.mockResolvedValue({ id: 101 });

            await saveToStorage(req, res);

            // Verificamos éxito
            expect(res.statusCode).toBe(201);
            // Verificamos que Sharp redimensionó a 300px para el thumbnail
            expect(mockSharpResize).toHaveBeenCalledWith(300);
            expect(CampaignAsset.create).toHaveBeenCalled();
        });
    });

    describe('refineAsset', () => {
        test('Debe procesar la fusión de imágenes correctamente con Gemini', async () => {
            // Seteamos respuesta exitosa (con imagen)
            mockGeminiResponse = {
                response: {
                    candidates: [{
                        content: {
                            parts: [
                                { text: "Imagen fusionada" },
                                { inlineData: { data: 'YmFzZTY0', mimeType: 'image/png' } }
                            ]
                        }
                    }]
                }
            };

            req = { body: { assetIds: ["A1", "A2"], refinementPrompt: "Fusionar" } };
            CampaignAsset.where().get.mockResolvedValue([
                { id: "A1", img_url: { url: "http://x.com/1.png" }, campaign_assets: "C1" }
            ]);
            CampaignAsset.create.mockResolvedValue({ id: "NEW-99" });

            await refineAsset(req, res);

            expect(res.statusCode).toBe(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        test('Debe manejar el caso donde Gemini solo devuelve texto y no imagen', async () => {
            // Seteamos respuesta fallida (solo texto)
            mockGeminiResponse = {
                response: {
                    candidates: [{
                        content: { parts: [{ text: "No pude generar la imagen por políticas de seguridad" }] }
                    }]
                }
            };

            req = { body: { assetId: "A1", refinementPrompt: "Solo texto por favor" } };
            CampaignAsset.where().get.mockResolvedValue([{ id: "A1", img_url: "url", campaign_assets: "C1" }]);

            await refineAsset(req, res);

            // El controlador debe responder con éxito: false y tipo text_only
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                success: false,
                type: "text_only"
            }));
        });
    });

    // ... todo tu código anterior (mocks, importaciones, etc.)

    describe('GeneratorController - Suite Completa Corregida', () => {
        let req, res;

        beforeEach(() => {
            jest.clearAllMocks();
            // Esto es lo que faltaba que los nuevos tests vieran
            res = {
                statusCode: 200,
                json: jest.fn().mockReturnThis(),
                status: jest.fn().mockReturnThis()
            };
        });

        // --- Tests que ya tenías ---
        describe('saveToStorage', () => { /* ... */ });
        describe('refineAsset', () => { /* ... */ });

        // --- NUEVA SECCIÓN: Agrégala AQUÍ ADENTRO ---
        describe('Casos de Borde y Ramificaciones (Branches)', () => {

            test('Debe procesar imágenes en formato JPEG (Branch Coverage)', async () => {
                // Re-importamos sharp para manipular el mock en este test específico
                const sharp = (await import('sharp')).default;
                sharp().metadata.mockResolvedValueOnce({ format: 'jpeg' });

                req = {
                    body: { campaignId: "C-JPG", prompt: "test jpg" },
                    files: { image: [{ data: Buffer.from('fake-jpeg'), name: 'foto.jpg' }] }
                };

                await saveToStorage(req, res);

                expect(res.statusCode).toBe(201);
                expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
            });

            test('Debe probar el fallback de archivos con nombres personalizados', async () => {
                req = {
                    body: { campaignId: "C-CUSTOM" },
                    files: {
                        fotoPortada: [{ data: Buffer.from('data'), name: 'portada.png' }]
                    }
                };

                await saveToStorage(req, res);

                expect(res.statusCode).toBe(201);
                // Si tu controlador devuelve el conteo de assets guardados
                expect(res.json).toHaveBeenCalled();
            });
        });
    }); // <--- Este es el cierre final del describe principal

    describe('Pruebas de Resiliencia (Errores de Red)', () => {

        test('Debe manejar un fallo de red en Axios (Error 500)', async () => {
            // Simulamos que la descarga de la imagen falla catastróficamente
            const axios = (await import('axios')).default;
            axios.get.mockRejectedValueOnce(new Error("Fallo de conexión al descargar imagen"));

            req = {
                body: { assetIds: ["A1"], refinementPrompt: "Fusión con error" }
            };

            // Necesitamos que el mock de DB devuelva algo para que llegue al axios.get
            CampaignAsset.where().get.mockResolvedValueOnce([{
                id: "A1",
                img_url: "http://test.com/img.png",
                campaign_assets: "C1"
            }]);

            await refineAsset(req, res);

            // Verificamos que el controlador atrapó el error y respondió con 500
            expect(res.statusCode).toBe(500);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: "Fallo de conexión al descargar imagen"
            }));
        });

        test('Debe manejar un error inesperado en saveToStorage', async () => {
            req = {
                body: { campaignId: "C1" },
                files: { images: [{ data: Buffer.from('...'), name: 'x.png' }] }
            };

            // Forzamos un error en la base de datos para este caso
            CampaignAsset.create.mockRejectedValueOnce(new Error("Database Timeout"));

            await saveToStorage(req, res);

            expect(res.statusCode).toBe(500);
            expect(res.json).toHaveBeenCalledWith({ error: "Database Timeout" });
        });
    });
});
