import { AuthPort } from '../../../application/ports/AuthPort.js';
import supabase from './supabaseClient.js';

export class SupabaseAuthAdapter extends AuthPort {
    async login(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(error.message);
        return { user: data.user, session: data.session };
    }

    async register(email, password, metadata) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata }
        });
        if (error) throw new Error(error.message);
        return { user: data.user, session: data.session };
    }

    async verifyToken(token) {
        const { data, error } = await supabase.auth.getUser(token);
        if (error) throw new Error('Token inválido');
        return data.user;
    }
}