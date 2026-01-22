/**
 * ------------------------------------------------------------------
 * Archivo: SupabaseClient.js
 * Ubicación: src/services/SupabaseClient.js
 * Descripción: Configuración e inicialización del cliente de Supabase.
 * Este archivo actúa como un Singleton: se conecta una vez y exporta
 * la instancia lista para ser usada en cualquier parte del proyecto.
 * ------------------------------------------------------------------
 */

import { createClient } from '@supabase/supabase-js';
import { Regulator } from 'nicola-framework';

// 1. Carga de Variables de Entorno
// Inicializamos el gestor de entorno de Nicola para leer el archivo .env
Regulator.load();

// 2. Obtención de Credenciales
// Para operaciones de backend usamos la Service Role Key que bypasea RLS
// Para operaciones de frontend (si las hubiera), usarías SUPABASE_KEY
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

// 3. Validación de Seguridad (Fail Fast)
// Verificamos que las credenciales existan antes de intentar conectar.
// Si faltan, detenemos la ejecución inmediatamente para evitar errores
// silenciosos o comportamientos inesperados más adelante.
if (!supabaseUrl || !supabaseKey) {
    throw new Error("ERROR FATAL: Faltan credenciales de SUPABASE en el archivo .env");
}

// 4. Inicialización y Exportación
// Creamos la instancia del cliente con las credenciales validadas.
// Al exportar 'const supabase', cualquier archivo que importe esto
// usará la misma conexión (ahorro de recursos).


export const supabase = createClient(supabaseUrl, supabaseKey);