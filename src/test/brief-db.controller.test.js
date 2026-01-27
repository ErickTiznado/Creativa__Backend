// src/test/Brief_BD_save.test.js

// 1. IMPORTAR EL CONTROLADOR
// (Ajusta el nombre del archivo si en tu carpeta es 'brief-db.controller.js' o 'Brief_BD_save.js')
import { brief_DB } from '../controllers/brief-db.controller.js';

// 2. IMPORTAR SUPABASE (Para los expect)
import { supabase } from '../services/SupabaseClient.js';

// --- MOCKS ---

// A. Mock de 'crypto' (Para que randomUUID siempre devuelva lo mismo)
jest.mock('crypto', () => ({
    randomUUID: jest.fn(() => 'uuid-falso-123')
}));

// B. Mock de Supabase (Factory Pattern para cadenas)
jest.mock('../services/SupabaseClient.js', () => {
    return {
        supabase: {
            // Métodos encadenables (devuelven 'this')
            schema: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(), // .update() devuelve el objeto para seguir con .eq()
            
            // Métodos finales (devuelven Promesas)
            insert: jest.fn(),
            eq: jest.fn(),
            maybeSingle: jest.fn()
        }
    };
});

describe('Brief_BD Tests (brief-db.controller)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup básico de Request y Response
        req = {
            body: {}
        };

        res = {
            statusCode: 200,
            json: jest.fn(),
            end: jest.fn()
        };

        // REINICIO DE COMPORTAMIENTO DE CADENAS
        // Aseguramos que update devuelva 'this' (el objeto supabase simulado)
        supabase.update.mockReturnThis();
        // Aseguramos que select devuelva 'this'
        supabase.select.mockReturnThis();
    });

    // ----------------------------------------------------------------
    // 1. TEST Create_Campaing
    // ----------------------------------------------------------------
    describe('Create_Campaing', () => {
        test('Debe devolver 400 si falta user_id', async () => {
            req.body = {}; // Sin user_id
            await brief_DB.Create_Campaing(req, res);
            
            expect(res.statusCode).toBe(400);
            expect(res.json).toHaveBeenCalledWith({ error: "El campo user_id es obligatorio." });
        });

        test('Debe devolver 500 si Supabase falla al insertar', async () => {
            req.body = { user_id: 'user-1' };
            // Simulamos error en .insert()
            supabase.insert.mockResolvedValue({ error: { message: 'DB Error' } });

            await brief_DB.Create_Campaing(req, res);

            expect(res.statusCode).toBe(500);
        });

        test('Debe devolver 201 y crear campaña si todo es correcto', async () => {
            req.body = { user_id: 'user-1' };
            // Simulamos éxito
            supabase.insert.mockResolvedValue({ error: null });

            await brief_DB.Create_Campaing(req, res);

            expect(res.statusCode).toBe(201);
            expect(res.json).toHaveBeenCalledWith({ message: "Brief creado correctamente" });
            
            // Verificamos que se llamó con el esquema correcto
            expect(supabase.schema).toHaveBeenCalledWith('devschema');
            expect(supabase.from).toHaveBeenCalledWith('campaigns');
        });
    });

    // ----------------------------------------------------------------
    // 2. TEST updateDataBrief
    // ----------------------------------------------------------------
    describe('updateDataBrief', () => {
        test('Debe devolver 400 si faltan datos obligatorios', async () => {
            req.body = { idCampaing: '123' }; // Falta 'data'
            await brief_DB.updateDataBrief(req, res);
            expect(res.statusCode).toBe(400);
        });

        test('Debe devolver 200 si actualiza correctamente', async () => {
            req.body = { idCampaing: 'camp-1', data: { info: 'test' } };

            // CONFIGURACIÓN CLAVE PARA UPDATE
            // 1. .update() devuelve 'this' (ya configurado en beforeEach)
            // 2. .eq() es el final de la cadena, él devuelve la promesa.
            supabase.eq.mockResolvedValue({ error: null });

            await brief_DB.updateDataBrief(req, res);

            expect(res.statusCode).toBe(200);
            expect(supabase.update).toHaveBeenCalledWith({ brief_data: { info: 'test' } });
            expect(supabase.eq).toHaveBeenCalledWith('id', 'camp-1');
        });

        test('Debe devolver 500 si Supabase falla', async () => {
            req.body = { idCampaing: 'camp-1', data: {} };
            
            // Simulamos error en el paso final (.eq)
            supabase.eq.mockResolvedValue({ error: { message: 'Update failed' } });

            await brief_DB.updateDataBrief(req, res);
            expect(res.statusCode).toBe(500);
        });
    });

    // ----------------------------------------------------------------
    // 3. TEST Registrar_Brief (El más complejo)
    // ----------------------------------------------------------------
    describe('Registrar_Brief', () => {
        
        // CASO A: Crear Nuevo Brief (sin idCampaing)
        test('Debe crear un NUEVO brief con UUID si no se envía idCampaing', async () => {
            req.body = { data: { some: 'info' } }; // idCampaing es undefined
            
            // Simulamos insert exitoso
            supabase.insert.mockResolvedValue({ error: null });

            await brief_DB.Registrar_Brief(req, res);

            expect(res.statusCode).toBe(201);
            // Verificamos que usó el UUID falso de nuestro mock de crypto
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                id: 'uuid-falso-123',
                message: "Brief creado correctamente"
            }));
            
            // Verificar inserción
            expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({
                id: 'uuid-falso-123',
                status: 'draft'
            }));
        });

// CASO B: Actualizar Existente (con idCampaing)
        test('Debe actualizar brief EXISTENTE si se envía idCampaing válido', async () => {
            req.body = { idCampaing: 'camp-existente', data: { new: 'info' } };

            // CORRECCIÓN MAESTRA:
            // 1. Primera llamada a .eq() (dentro de Registrar_Brief para verificar): 
            //    Debe devolver el objeto 'supabase' para que se pueda llamar a .maybeSingle() después.
            supabase.eq.mockImplementationOnce(() => supabase);
            
            // 2. Segunda llamada a .eq() (dentro de updateDataBrief para actualizar):
            //    Es el final de la cadena, debe devolver la promesa con el resultado (null error).
            supabase.eq.mockResolvedValueOnce({ error: null });

            // Configuramos .maybeSingle() (que se llama después del primer .eq)
            supabase.maybeSingle.mockResolvedValue({ data: { id: 'camp-existente' }, error: null });

            await brief_DB.Registrar_Brief(req, res);

            // Verificamos que delegó correctamente (debería dar 200 del updateDataBrief)
            expect(res.statusCode).toBe(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                message: "Modificación de datos de campaña exitosa."
            }));
        });
    });
});