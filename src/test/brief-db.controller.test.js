import { jest } from '@jest/globals';

// 1. MOCKS
const mockBuilder = {
    schema: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    maybeSingle: jest.fn()
};

// Setup de mocks encadenables
const setupMockBuilder = () => {
    mockBuilder.schema.mockReturnThis();
    mockBuilder.from.mockReturnThis();
    mockBuilder.select.mockReturnThis();
    mockBuilder.update.mockReturnThis();

    // eq() devuelve un objeto que tiene maybeSingle(), update(), etc si es necesario
    // En este controlador se usa:
    // .update().eq() -> await
    // .select().eq().maybeSingle() -> await

    // Solución Simple: eq devuelve el builder
    mockBuilder.eq.mockReturnValue(mockBuilder);

    // insert devuelve PROMESA por defecto (ya que se usa await .insert())
    mockBuilder.insert.mockResolvedValue({ error: null });

    // update devuelve PROMESA si es el final, PERO tambien es builder si sigue .eq()
    // En brief-db: update({}).eq()
    // Asi que update() debe devolver builder.
    mockBuilder.update.mockReturnValue(mockBuilder);

    // eq() al final debe resolverse
    // PERO eq() al medio debe encadenar.
    // Hack: Hacemos que eq sea ThenableMock
    mockBuilder.eq.mockImplementation(() => {
        const p = Promise.resolve({ error: null });
        p.maybeSingle = mockBuilder.maybeSingle;
        return p;
    });

    mockBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });
}

jest.unstable_mockModule('crypto', () => ({
    randomUUID: jest.fn(() => 'uuid-123')
}));

jest.unstable_mockModule('../services/SupabaseClient.js', () => ({ supabase: mockBuilder }));
jest.unstable_mockModule('../services/SupabaseClient.js', () => ({ supabase: mockBuilder })); // Case checking
jest.unstable_mockModule('../services/supaBaseClient.js', () => ({ supabase: mockBuilder }));

// 2. IMPORTS
const { brief_DB } = await import('../controllers/brief-db.controller.js');

// 3. SUITE
describe('Brief DB Controller (ESM)', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();
        setupMockBuilder();

        req = { body: {} };
        res = { statusCode: 200, json: jest.fn() };
    });

    describe('Create_Campaing', () => {
        test('Debe crear campaña con éxito', async () => {
            req.body = { user_id: 'u1' };
            await brief_DB.Create_Campaing(req, res);
            expect(res.statusCode).toBe(201);
            expect(mockBuilder.insert).toHaveBeenCalledWith(expect.objectContaining({ status: "new" }));
        });

        test('Debe fallar si falta user_id', async () => {
            req.body = {};
            await brief_DB.Create_Campaing(req, res);
            expect(res.statusCode).toBe(400);
        });

        test('Debe manejar error de BD', async () => {
            req.body = { user_id: 'u1' };
            mockBuilder.insert.mockResolvedValue({ error: 'DB Error' });
            await brief_DB.Create_Campaing(req, res);
            expect(res.statusCode).toBe(500);
        });
    });

    describe('updateDataBrief', () => {
        test('Debe actualizar brief con éxito', async () => {
            req.body = { idCampaing: 'c1', data: { a: 1 } };
            // .update().eq() -> mockBuilder.eq devuelve promesa

            await brief_DB.updateDataBrief(req, res);
            expect(res.statusCode).toBe(200);
            expect(mockBuilder.update).toHaveBeenCalledWith({ brief_data: { a: 1 } });
        });

        test('Debe fallar si faltan datos', async () => {
            req.body = { idCampaing: 'c1' }; // falta data
            await brief_DB.updateDataBrief(req, res);
            expect(res.statusCode).toBe(400);
        });

        test('Debe manejar error en update', async () => {
            req.body = { idCampaing: 'c1', data: {} };
            // Simulamos error en el await .eq()
            mockBuilder.eq.mockResolvedValue({ error: 'Update Failed' });

            await brief_DB.updateDataBrief(req, res);
            expect(res.statusCode).toBe(500);
        });
    });

    describe('Registrar_Brief', () => {
        test('Debe crear NUEVO brief si idCampaing es nulo', async () => {
            req.body = { user_id: 'u1', data: { b: 2 } };

            await brief_DB.Registrar_Brief(req, res);

            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ id: 'uuid-123' }));
            expect(mockBuilder.insert).toHaveBeenCalled();
            expect(res.statusCode).toBe(201);
        });

        test('Debe actualizar brief EXISTENTE si idCampaing viene y existe', async () => {
            req.body = { user_id: 'u1', data: { b: 2 }, idCampaing: 'c1' };

            // 1. Check existing: .select().eq().maybeSingle()
            mockBuilder.maybeSingle.mockResolvedValue({ data: { id: 'c1' }, error: null });

            // 2. Delegar a updateDataBrief -> mockBuilder.eq returns promise

            await brief_DB.Registrar_Brief(req, res);

            expect(res.statusCode).toBe(200);
            expect(mockBuilder.update).toHaveBeenCalled();
        });

        test('Debe crear NUEVO brief si idCampaing viene pero NO existe en BD (fallo check)', async () => {
            // Nota: El codigo actual SIEMPRE crea nuevo si no encuentra?
            // Codigo: if (existingCampaign) return update...
            // Luego sigue y crea nuevo. ASI QUE SI, crea uno nuevo.

            req.body = { user_id: 'u1', data: { b: 2 }, idCampaing: 'c1' };
            mockBuilder.maybeSingle.mockResolvedValue({ data: null, error: null });

            await brief_DB.Registrar_Brief(req, res);

            expect(mockBuilder.insert).toHaveBeenCalled(); // Crea nuevo
            expect(res.statusCode).toBe(201);
        });

        test('Debe manejar error en verificación de campaña', async () => {
            req.body = { idCampaing: 'c1' };
            mockBuilder.maybeSingle.mockResolvedValue({ data: null, error: 'DB Err' });

            await brief_DB.Registrar_Brief(req, res);
            expect(res.statusCode).toBe(500);
        });

        test('Debe manejar error en inserción de nuevo brief', async () => {
            req.body = { user_id: 'u1', data: {} };
            mockBuilder.insert.mockResolvedValue({ error: 'Insert Fail' });

            await brief_DB.Registrar_Brief(req, res);
            expect(res.statusCode).toBe(500);
        });
    });
});