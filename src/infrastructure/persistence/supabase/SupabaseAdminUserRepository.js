import { AdminUserRepositoryPort } from '../../../application/ports/AdminUserRepositoryPort.js';
import supabase from './supabaseClient.js';

export class SupabaseAdminUserRepository extends AdminUserRepositoryPort {

    async listUsers() {
        const { data, error } = await supabase
            .from('profile')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data.map(this.#mapProfile);
    }

    async createUser({ email, password, firstName, lastName, role }) {
        // Crear usuario en Supabase Auth (requiere service role key)
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { first_name: firstName, last_name: lastName, role }
        });

        if (authError) throw new Error(authError.message);

        // Intentar insertar el perfil manualmente (por si no hay trigger automático)
        const { data: profileData, error: profileError } = await supabase
            .from('profile')
            .insert({
                id: authData.user.id,
                email,
                first_name: firstName,
                last_name: lastName,
                role,
                is_active: true
            })
            .select()
            .single();

        // Si ya existe el perfil (creado por trigger), simplemente lo buscamos
        if (profileError && profileError.code === '23505') {
            const { data: existing } = await supabase
                .from('profile')
                .select('*')
                .eq('id', authData.user.id)
                .single();
            return this.#mapProfile(existing);
        }

        if (profileError) throw new Error(profileError.message);
        return this.#mapProfile(profileData);
    }

    async updateUser(userId, { firstName, lastName, role }) {
        const dbData = {};
        if (firstName !== undefined) dbData.first_name = firstName;
        if (lastName !== undefined) dbData.last_name = lastName;
        if (role !== undefined) dbData.role = role;

        const { data, error } = await supabase
            .from('profile')
            .update(dbData)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return this.#mapProfile(data);
    }

    async deleteUser(userId) {
        // Eliminar perfil primero para evitar FK violations
        await supabase.from('profile').delete().eq('id', userId);

        // Luego eliminar de Auth
        const { error } = await supabase.auth.admin.deleteUser(userId);
        if (error) throw new Error(error.message);

        return { success: true };
    }

    async toggleUserStatus(userId, isActive) {
        const { data, error } = await supabase
            .from('profile')
            .update({ is_active: isActive })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return this.#mapProfile(data);
    }

    #mapProfile(data) {
        return {
            id: data.id,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            role: data.role,
            isActive: data.is_active,
            createdAt: data.created_at
        };
    }
}
