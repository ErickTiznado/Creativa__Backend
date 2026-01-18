
import { createClient } from '@supabase/supabase-js';
import { Regulator } from 'nicola-framework';


Regulator.load();


const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error("ERROR FATAL: Faltan credenciales de SUPABASE en el archivo .env");
}

export const supabase = createClient(supabaseUrl, supabaseKey);