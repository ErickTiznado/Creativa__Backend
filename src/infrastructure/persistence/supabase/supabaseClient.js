import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Faltan las credenciales de Supabase en el archivo .env');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    db: {
        schema: 'devschema',
    }
});

export default supabase;