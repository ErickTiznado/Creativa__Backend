import supabase from './src/infrastructure/persistence/supabase/supabaseClient.js';
import fs from 'fs';

async function test() {
    let out = "=== Testing devschema_test.profile ===\n";
    try {
        const res = await supabase.from('profile').select('*').limit(1);
        out += "Result profile devschema_test:\n" + JSON.stringify(res, null, 2) + "\n";
    } catch (e) {
        out += "Error devschema_test: " + e.message + "\n";
    }

    out += "\n=== Testing auth.users ===\n";
    try {
        const authRes = await supabase.auth.admin.listUsers();
        out += "Auth users result: " + (authRes.error ? authRes.error.message : authRes.data.users.length + " users found") + "\n";
    } catch (e) {
        out += "Error auth: " + e.message + "\n";
    }

    fs.writeFileSync('tmp_test_db.txt', out);
}

test();
