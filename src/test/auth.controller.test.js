// src/test/auth.controller.test.js

// 1. IMPORTAR EL CONTROLADOR (Corregido el nombre del archivo)
import AuthController from '../controllers/auth.controller.js';

// 2. IMPORTAR SUPABASE (Para poder usarlo en los 'expect')
// Al estar mockeado abajo, esta importación traerá la versión falsa automáticamente.
import { supabase } from '../services/SupabaseClient.js';

// --- MOCKS DE DEPENDENCIAS ---

// A. Mock de Nicola Framework
jest.mock('nicola-framework', () => {
    class MockPatternBuilder {
        startOfLine() { return this; }
        word() { return this; }
        oneOrMore() { return this; }
        find() { return this; }
        endOfLine() { return this; }
        range() { return this; }
        digit() { return this; }
        matches() { return true; } // Siempre valida true
    }

    return {
        Coherer: {
            sign: jest.fn(() => 'fake_jwt_token'),
            verify: jest.fn(() => ({ userId: 'user-123' }))
        },
        PatternBuilder: MockPatternBuilder
    };
});

// B. Mock de Supabase (SOLUCIÓN AL ERROR DE HOISTING)
// Definimos el objeto DIRECTAMENTE dentro del mock factory
jest.mock('../services/SupabaseClient.js', () => {
    return {
        supabase: {
            auth: {
                signInWithPassword: jest.fn(),
                signUp: jest.fn(),
                resetPasswordForEmail: jest.fn(),
                getUser: jest.fn(),
                admin: {
                    updateUserById: jest.fn()
                }
            },
            // Métodos encadenables (devuelven 'this' para poder seguir poniendo puntos)
            schema: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn()
        }
    };
});

// --- SUITE DE PRUEBAS ---
describe('AuthController Tests', () => {
    let req, res;

    beforeEach(() => {
        jest.clearAllMocks();

        req = {
            body: {},
            params: {},
            headers: {},
            user: {}
        };

        // Mock de Response estilo Nicola
        res = {
            statusCode: 200,
            json: jest.fn(),
            end: jest.fn()
        };
        
        // Aseguramos que los métodos encadenables devuelvan 'this'
        // (Aunque el mock factory ya lo hace, esto reinicia el estado limpio)
        supabase.insert.mockReturnThis();
        supabase.update.mockReturnThis();
    });

    // ----------------------------------------------------------------
    // TEST LOGIN
    // ----------------------------------------------------------------
    describe('POST /login', () => {
        test('Debe devolver 400 si faltan credenciales', async () => {
            req.body = { email: '' }; // Falta password
            await AuthController.login(req, res);
            expect(res.statusCode).toBe(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: expect.any(String) }));
        });

        test('Debe devolver 401 si Supabase devuelve error de auth', async () => {
            req.body = { email: 'test@test.com', password: 'badpassword' };
            
            // Usamos la variable 'supabase' que importamos arriba
            supabase.auth.signInWithPassword.mockResolvedValue({ 
                data: null, 
                error: { message: 'Credenciales invalidas' } 
            });

            await AuthController.login(req, res);
            expect(res.statusCode).toBe(401);
        });

        test('Debe devolver 200 y Token si todo es correcto', async () => {
            req.body = { email: 'test@test.com', password: '123' };
            
            supabase.auth.signInWithPassword.mockResolvedValue({ 
                data: { user: { id: '123', email: 'test@test.com' } }, 
                error: null 
            });

            await AuthController.login(req, res);
            
            expect(res.statusCode).toBe(200);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ 
                token: 'fake_jwt_token',
                message: "Login exitoso"
            }));
        });
    });

    // ----------------------------------------------------------------
    // TEST REGISTER
    // ----------------------------------------------------------------
    describe('POST /register', () => {
        test('Debe devolver 201 si registra y guarda perfil correctamente', async () => {
            req.body = { 
                email: 'new@test.com', password: '123', 
                firstName: 'Juan', lastName: 'Perez' 
            };

            // 1. Mock Sign Up exitoso
            supabase.auth.signUp.mockResolvedValue({
                data: { user: { id: 'new-user-id' } },
                error: null
            });

            // 2. Mock Insert Profile exitoso
            supabase.insert.mockResolvedValue({ error: null });

            await AuthController.register(req, res);

            expect(res.statusCode).toBe(201);
            expect(supabase.schema).toHaveBeenCalledWith('devschema');
            expect(supabase.from).toHaveBeenCalledWith('profile');
        });

        test('Debe devolver 400 si falla el registro en Auth', async () => {
            req.body = { email: 'x', password: 'x' };
            supabase.auth.signUp.mockResolvedValue({
                data: null,
                error: { message: 'Email invalido' }
            });

            await AuthController.register(req, res);
            expect(res.statusCode).toBe(400);
        });
    });

    // ----------------------------------------------------------------
    // TEST FORGOT PASSWORD
    // ----------------------------------------------------------------
    describe('POST /forgot-password', () => {
        test('Debe devolver 200 si el email es válido', async () => {
            req.body = { email: 'valid@test.com' };
            process.env.FRONTEND_URL = 'http://localhost'; 

            supabase.auth.resetPasswordForEmail.mockResolvedValue({ error: null });

            await AuthController.forgotPassword(req, res);
            expect(res.statusCode).toBe(200);
        });
    });

    // ----------------------------------------------------------------
    // TEST CHANGE ROLE
    // ----------------------------------------------------------------
    describe('PUT /change-role', () => {
        test('Debe impedir cambiarse el rol a uno mismo', async () => {
            req.user = { userId: 'my-id' };
            req.body = { targetUserId: 'my-id', newRole: 'admin' };

            await AuthController.changeUserRole(req, res);
            
            expect(res.statusCode).toBe(400);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
                error: expect.stringContaining("No puedes cambiar tu propio rol")
            }));
        });

test('Debe actualizar Auth y DB si es otro usuario', async () => {
            req.user = { userId: 'admin-id' };
            req.body = { targetUserId: 'other-id', newRole: 'admin' };

            // Mock éxito Auth
            supabase.auth.admin.updateUserById.mockResolvedValue({ error: null });
            
            // --- CORRECCIÓN AQUÍ ---
            // NO tocamos .update() (dejamos que siga devolviendo 'this' por defecto)
            // Configuramos .eq() para que sea él quien devuelva el "éxito" final.
            supabase.eq.mockResolvedValue({ error: null });

            await AuthController.changeUserRole(req, res);

            // Verificamos
            expect(res.statusCode).toBe(200);
            expect(supabase.auth.admin.updateUserById).toHaveBeenCalled();
            expect(supabase.from).toHaveBeenCalledWith('profile');
        });
    });
});