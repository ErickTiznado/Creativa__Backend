// src/test/campaigns.controller.test.js

// 1. IMPORTAR EL CONTROLADOR
// Nota: Usamos { } porque en tu código es 'export const', no 'export default'
import { getCampaigns } from '../controllers/campaigns.controller.js';

// 2. IMPORTAR EL MODELO (Para mockearlo)
import Brief from '../model/Brief.model.js';

// 3. MOCK DEL MODELO
// Usamos el patrón Factory para evitar errores de inicialización
jest.mock('../model/Brief.model.js', () => {
    return {
        __esModule: true,
        default: {
            // Simulamos que .select() devuelve el mismo objeto (this) para poder encadenar .get()
            select: jest.fn().mockReturnThis(),
            get: jest.fn()
        }
    };
});

describe('CampaignsController', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {}; // No necesitamos nada en el request para este endpoint

        // Mock de Response estilo Nicola
        res = {
            statusCode: 200, // Valor por defecto
            json: jest.fn()
        };

        // Aseguramos que el encadenamiento esté listo
        Brief.select.mockReturnThis();
    });

    // TEST 1: Éxito (Happy Path)
    test('Debe devolver todas las campañas y status 200', async () => {
        const mockData = [{ id: 1, name: 'Campaña Coca Cola' }, { id: 2, name: 'Campaña Pepsi' }];
        
        // Configuramos que .get() devuelva los datos
        Brief.get.mockResolvedValue(mockData);

        await getCampaigns(req, res);

        // Verificamos respuesta
        // Nota: En tu código no asignas res.statusCode = 200 explícitamente en éxito, 
        // pero se asume el default. Verificamos el JSON.
        expect(res.json).toHaveBeenCalledWith({
            message: "Campañas obtenidas con éxito",
            data: mockData,
            success: true,
        });
    });

    // TEST 2: Error de Base de Datos
    test('Debe devolver error 500 si falla la consulta', async () => {
        const errorMsg = "Error de conexión a DB";
        
        // Simulamos que .get() explota
        Brief.get.mockRejectedValue(new Error(errorMsg));

        await getCampaigns(req, res);

        // Verificamos manejo de error
        expect(res.statusCode).toBe(500);
        expect(res.json).toHaveBeenCalledWith({
            message: "Error al obtener las campañas",
            error: errorMsg,
            success: false,
        });
    });
});