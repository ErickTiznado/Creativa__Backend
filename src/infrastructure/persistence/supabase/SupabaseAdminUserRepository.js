import { AdminUserRepositoryPort } from '../../../application/ports/AdminUserRepositoryPort.js';
import supabase from './supabaseClient.js';

export class SupabaseAdminUserRepository extends AdminUserRepositoryPort {

    async listUsers() {
        // 1. Obtener perfiles de la tabla profile
        const { data: profiles, error } = await supabase
            .from('profile')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);

        // 2. Obtener usuarios de auth para conseguir los emails
        const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
        if (authError) throw new Error(authError.message);

        // 3. Crear un mapa de id -> email desde auth.users
        const emailMap = {};
        for (const authUser of authUsers) {
            emailMap[authUser.id] = authUser.email;
        }

        // 4. Merge: usar el email de auth.users para cada perfil
        return profiles.map(profile => this.#mapProfile(profile, emailMap[profile.id]));
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

        // Insertar el perfil SIN email (el email vive en auth.users)
        const { data: profileData, error: profileError } = await supabase
            .from('profile')
            .insert({
                id: authData.user.id,
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
            return this.#mapProfile(existing, authData.user.email);
        }

        if (profileError) throw new Error(profileError.message);
        return this.#mapProfile(profileData, authData.user.email);
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

        // Obtener email desde auth.users
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
        return this.#mapProfile(data, authUser?.email);
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

        // Obtener email desde auth.users
        const { data: { user: authUser } } = await supabase.auth.admin.getUserById(userId);
        return this.#mapProfile(data, authUser?.email);
    }

    // email viene de auth.users, no de la tabla profile
    #mapProfile(data, email = null) {
        return {
            id: data.id,
            email: email || data.email || null,
            firstName: data.first_name,
            lastName: data.last_name,
            role: data.role,
            isActive: data.is_active,
            createdAt: data.created_at
        };
    }
}
