import { jest } from '@jest/globals';

// 1. MOCKS
jest.unstable_mockModule('nicola-framework', () => ({
    Regulator: { load: jest.fn() },
    cyan: jest.fn()
}));

jest.unstable_mockModule('../model/ChatSession.model.js', () => ({
    default: {
        where: jest.fn().mockReturnThis(),
        get: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    }
}));

const mockGenerateContent = jest.fn();
jest.unstable_mockModule('../shemas/chatBrief.shemaIA.js', () => ({
    default: jest.fn(() => ({ generateContent: mockGenerateContent }))
}));

// 2. IMPORTS
const { default: handleChat } = await import('../controllers/briefchat.controller.js');
const { default: ChatSession } = await import('../model/ChatSession.model.js');

// Helpers
const createAiResponse = (text, functionCall = null) => ({
    response: {
        candidates: [{
            content: {
                parts: [
                    functionCall ? { functionCall } : { text }
                ]
            }
        }]
    }
});

global.fetch = jest.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) }));

// 3. SUITE
describe('BriefChatController (ESM)', () => {
    let req, res;
    beforeEach(() => {
        jest.clearAllMocks();
        req = { body: { sessionID: '123', userMessage: 'Hola', userId: 'u1' } };
        res = { statusCode: 200, json: jest.fn() };
        ChatSession.where.mockReturnThis();

        // Default behaviour: session empty
        ChatSession.get.mockResolvedValue([]);
    });

    test('Debe fallar si no hay sessionID', async () => {
        req.body = {};
        await handleChat(req, res);
        expect(res.statusCode).toBe(400);
    });

    test('Debe usar sesion existente si la encuentra', async () => {
        ChatSession.get.mockResolvedValue([{
            userId: 'u1',
            chat: { message: [{ role: 'user' }], data: { a: 1 } }
        }]);

        mockGenerateContent.mockResolvedValue(createAiResponse("Hola de nuevo"));

        await handleChat(req, res);

        expect(ChatSession.create).not.toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ type: "message" }));
    });

    test('Debe manejar Function Call y guardar datos', async () => {
        ChatSession.create.mockResolvedValue({ id: '123' });

        // 1. AI responde con Function Call
        mockGenerateContent.mockResolvedValueOnce(
            createAiResponse(null, { name: "Campaing_Brief", args: { nombre_campaing: "Test" } })
        );
        // 2. AI responde confirmación de texto (tras recibir function response)
        mockGenerateContent.mockResolvedValueOnce(
            createAiResponse("He guardado el nombre")
        );

        await handleChat(req, res);

        expect(global.fetch).not.toHaveBeenCalled(); // No completo
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            type: "data_collected",
            collectedData: expect.objectContaining({ nombre_campaing: "Test" })
        }));
    });

    test('Debe manejar Function Call COMPLETO y llamar a fetch', async () => {
        ChatSession.create.mockResolvedValue({ id: '123' });

        // 1. AI responde con Function Call y flag datos_completos
        mockGenerateContent.mockResolvedValueOnce(
            createAiResponse(null, { name: "Campaing_Brief", args: { nombre_campaing: "Test", datos_completos: true } })
        );
        // 2. AI responde confirmación
        mockGenerateContent.mockResolvedValueOnce(
            createAiResponse("Listo, campaña creada")
        );

        await handleChat(req, res);

        expect(global.fetch).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ type: "completed" }));
    });

    test('Debe activar Retry Flow si AI devuelve solo texto primero', async () => {
        // Escenario complejo: AI "olvida" llamar funcion, luego se le fuerza
        ChatSession.create.mockResolvedValue({ id: '123' });

        // 1. AI responde 'texto' (error, queriamos datos)
        mockGenerateContent.mockResolvedValueOnce(createAiResponse("Hola, dame datos"));

        // 2. Controller envia prompt de retry. AI responde ahora SI con Function Call
        mockGenerateContent.mockResolvedValueOnce(
            createAiResponse(null, { name: "Campaing_Brief", args: { nombre_campaing: "Reintentado" } })
        );

        // 3. Controller envia function result. AI responde confirmacion
        mockGenerateContent.mockResolvedValueOnce(createAiResponse("Guardado tras retry"));

        await handleChat(req, res);

        expect(mockGenerateContent).toHaveBeenCalledTimes(3);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            type: "data_collected",
            collectedData: expect.objectContaining({ nombre_campaing: "Reintentado" })
        }));
    });

    test('Debe devolver FALLBACK si AI falla incluso tras retry', async () => {
        ChatSession.create.mockResolvedValue({ id: '123' });

        // 1. AI responde 'texto'
        mockGenerateContent.mockResolvedValueOnce(createAiResponse("Texto 1"));

        // 2. Retry: AI responde 'texto' OTRA VEZ
        mockGenerateContent.mockResolvedValueOnce(createAiResponse("Texto 2 (Fail)"));

        await handleChat(req, res);

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            type: "message",
            warning: expect.stringContaining("El modelo no ejecutó la función")
        }));
    });

    /*
    test('Debe reintentar si Vertex devuelve Error 429', async () => {
        ChatSession.create.mockResolvedValue({ id: '123' });
        
        // Mock implementation to throw once then succceed
        mockGenerateContent
            .mockRejectedValueOnce(new Error("429 Too Many Requests"))
            .mockResolvedValueOnce(createAiResponse("Recovered"));

        await handleChat(req, res);

        expect(mockGenerateContent).toHaveBeenCalledTimes(2);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ text: "Recovered" }));
    });
    */
});