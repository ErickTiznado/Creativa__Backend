// src/test/BriefChatController.test.js

// 1. IMPORTAR CONTROLADOR
import handleChat from '../controllers/briefchat.controller.js';

// 2. IMPORTAR DEPENDENCIAS MOCKEADAS
import ChatSession from '../model/ChatSession.model.js';
// (No importamos getModel directamente porque lo mockeamos abajo)

// --- MOCKS ---

// A. Mock de Nicola Framework (Para evitar logs y Regulator)
jest.mock('nicola-framework', () => ({
    Regulator: { load: jest.fn() },
    cyan: jest.fn()
}));

// B. Mock de ChatSession (Base de Datos)
jest.mock('../model/ChatSession.model.js', () => {
    return {
        // Métodos estáticos
        where: jest.fn().mockReturnThis(),
        get: jest.fn(),
        create: jest.fn(),
        // Para update, primero se hace where().update()
        update: jest.fn()
    };
});

// --- MOCKS ---

// A. Mock de Nicola Framework
jest.mock('nicola-framework', () => ({
    Regulator: { load: jest.fn() },
    cyan: jest.fn()
}));

// B. Mock de ChatSession
jest.mock('../model/ChatSession.model.js', () => {
    return {
        where: jest.fn().mockReturnThis(),
        get: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    };
});

// C. MOCK DE LA IA (CORREGIDO PARA EVITAR ERROR DE INITIALIZATION)
jest.mock('../shemas/chatBrief.shemaIA.js', () => {
    // 1. Creamos la función espía AQUÍ ADENTRO para que exista cuando se cree el mock
    const internalMock = jest.fn();
    
    // 2. Creamos la función 'getModel' que devuelve el objeto con nuestra espía
    const mockGetModel = jest.fn(() => ({
        generateContent: internalMock
    }));

    // 3. TRUCO: Le pegamos la espía al mockGetModel para poder "agarrarla" desde fuera
    mockGetModel.internalGenerateContent = internalMock;

    return {
        __esModule: true,
        default: mockGetModel
    };
});

// D. Mock Global de Fetch
global.fetch = jest.fn(() => 
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
    })
);

// --- IMPORTAMOS EL MODELO MOCKEADO PARA RECUPERAR EL CONTROL ---
import getModel from '../shemas/chatBrief.shemaIA.js';

// Recuperamos la función espía que escondimos en el paso 3
const mockGenerateContent = getModel.internalGenerateContent;

// ... (El resto del archivo sigue igual: createAiResponse, describe, etc.)

// D. Mock Global de Fetch (Para la llamada interna a registrarBrief)
global.fetch = jest.fn(() => 
    Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true })
    })
);

// --- HELPER PARA CREAR RESPUESTAS FALSAS DE GEMINI ---
// Esto ahorra escribir 20 líneas de JSON en cada test
const createAiResponse = (text, functionCall = null) => {
    return {
        response: {
            candidates: [{
                content: {
                    parts: [{
                        text: text,
                        functionCall: functionCall // { name: '...', args: {...} } o undefined
                    }]
                }
            }]
        }
    };
};

// --- SUITE DE PRUEBAS ---
describe('BriefChatController (Chat con Gemini)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        // Request básico
        req = {
            body: {
                sessionID: 'sesion-123',
                userMessage: 'Hola, quiero una campaña',
                userId: 'user-1'
            }
        };

        // Response Mock
        res = {
            statusCode: 200,
            json: jest.fn()
        };

        // Resetear comportamiento de ChatSession
        ChatSession.where.mockReturnThis();
    });

    // TEST 1: Validación básica
    test('Debe devolver 400 si falta sessionID', async () => {
        req.body.sessionID = null;
        await handleChat(req, res);
        expect(res.statusCode).toBe(400);
        expect(res.json).toHaveBeenCalledWith({ error: "El campo sessionID es obligatorio." });
    });

    // TEST 2: Nueva Sesión (Creación)
    test('Debe crear una sesión nueva en BD si no existe', async () => {
        // 1. Simulamos que NO encuentra la sesión en BD
        ChatSession.get.mockResolvedValue([]); 
        
        // 2. Simulamos creación exitosa
        ChatSession.create.mockResolvedValue({ id: 'sesion-123' });

        // 3. Simulamos respuesta de la IA (Solo texto, sin función)
        // Nota: Si no hay function call, tu controlador hace un reintento. 
        // Para este test simple, simulemos que a la primera devuelve function call para no complicar.
        mockGenerateContent.mockResolvedValue(
            createAiResponse("Entendido", { name: "Campaing_Brief", args: { nombre_campaing: "Prueba" } })
        );

        // Simulamos la segunda llamada (modelText) que hace tu código tras una function call
        mockGenerateContent.mockResolvedValueOnce(
            createAiResponse("Entendido", { name: "Campaing_Brief", args: { nombre_campaing: "Prueba" } })
        )
        .mockResolvedValueOnce(
            createAiResponse("¿Cuál es el objetivo?") // Respuesta de texto final
        );

        await handleChat(req, res);

        // Verificaciones
        expect(ChatSession.create).toHaveBeenCalled();
        expect(ChatSession.update).toHaveBeenCalled(); // Se actualiza al final
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            success: true,
            type: "data_collected"
        }));
    });

    // TEST 3: Flujo de Chat - Recolección de Datos (Function Call)
    test('Debe procesar Function Call y guardar datos en la sesión', async () => {
        // 1. Simulamos sesión existente con historial
        const mockSessionRecord = {
            id: 'sesion-123',
            chat: { message: [], data: { existing: 'data' } }
        };
        ChatSession.get.mockResolvedValue([mockSessionRecord]);

        // 2. Configurar IA:
        // LLAMADA 1 (modelFunction): Devuelve function call
        mockGenerateContent.mockResolvedValueOnce(
            createAiResponse(null, { 
                name: "Campaing_Brief", 
                args: { Objective: "Vender más", datos_completos: false } 
            })
        );
        // LLAMADA 2 (modelText): Devuelve respuesta al usuario
        mockGenerateContent.mockResolvedValueOnce(
            createAiResponse("Perfecto, he anotado el objetivo.")
        );

        await handleChat(req, res);

        // Verificamos que se guardaron los datos
        expect(ChatSession.update).toHaveBeenCalledWith(expect.objectContaining({
            chat: expect.objectContaining({
                data: expect.objectContaining({ Objective: "Vender más" })
            })
        }));

        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            text: "Perfecto, he anotado el objetivo.",
            collectedData: expect.objectContaining({ Objective: "Vender más" })
        }));
    });

    // TEST 4: Finalización (Datos Completos -> Fetch interno)
    test('Debe llamar a registrarBrief (fetch) cuando datos_completos es true', async () => {
        // Sesión existente
        ChatSession.get.mockResolvedValue([{ id: 'sesion-123', chat: { message: [], data: {} } }]);

        // Configurar IA para devolver 'datos_completos: true'
        mockGenerateContent.mockResolvedValueOnce(
            createAiResponse(null, { 
                name: "Campaing_Brief", 
                args: { nombre_campaing: "Final", datos_completos: true } 
            })
        );
        // Respuesta de texto final
        mockGenerateContent.mockResolvedValueOnce(
            createAiResponse("He terminado el brief.")
        );

        await handleChat(req, res);

        // VERIFICACIÓN CRÍTICA: ¿Se llamó al endpoint interno?
        expect(global.fetch).toHaveBeenCalledWith(
            "http://localhost:3000/ai/registerBrief",
            expect.objectContaining({
                method: "POST",
                body: expect.stringContaining("Final")
            })
        );

        // Verificar respuesta al cliente
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            type: "completed"
        }));
    });

    // TEST 5: Fallback / Retry (IA tonta no hace caso a la primera)
    test('Debe forzar un reintento si la IA no llama a la función a la primera', async () => {
        ChatSession.get.mockResolvedValue([{ id: '1', chat: { message: [], data: {} } }]);

        // LLAMADA 1: La IA responde solo texto (Olvida llamar a la función)
        mockGenerateContent.mockResolvedValueOnce(
            createAiResponse("Hola, soy una IA despistada")
        );

        // LLAMADA 2 (Retry forzado por tu código): Ahora sí llama a la función
        mockGenerateContent.mockResolvedValueOnce(
            createAiResponse(null, { 
                name: "Campaing_Brief", 
                args: { Description: "Reintento exitoso" } 
            })
        );

        // LLAMADA 3 (Generación de respuesta final tras function call exitoso)
        mockGenerateContent.mockResolvedValueOnce(
            createAiResponse("Datos guardados tras reintento")
        );

        await handleChat(req, res);

        // Verificamos que se llamó a la IA al menos 2 veces (Intento + Reintento)
        expect(mockGenerateContent).toHaveBeenCalledTimes(3); 
        
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
            collectedData: expect.objectContaining({ Description: "Reintento exitoso" })
        }));
    });
});