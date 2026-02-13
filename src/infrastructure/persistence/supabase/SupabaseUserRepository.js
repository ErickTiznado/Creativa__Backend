import { UserRepositoryPort } from '../../../application/ports/UserRepositoryPort.js';
import supabase from './supabaseClient.js';

export class SupabaseUserRepository extends UserRepositoryPort {
    async findById(userId) {
        const { data, error } = await supabase
            .from('profile') // Tabla en singular
            .select('*')
            .eq('id', userId)
            .single();

        if (error) throw new Error('Usuario no encontrado');

        // Mapeamos los datos de la BD a un objeto más limpio para la app
        return {
            id: data.id,
            email: data.email, // Ojo: A veces el email no está en profile, sino en auth.users
            firstName: data.first_name,
            lastName: data.last_name,
            role: data.role
        };
    }

    async update(userId, dataToUpdate) {
        // Convertimos camelCase (app) a snake_case (BD)
        const dbData = {};
        if (dataToUpdate.firstName) dbData.first_name = dataToUpdate.firstName;
        if (dataToUpdate.lastName) dbData.last_name = dataToUpdate.lastName;
        // Agrega avatar si decides crearlo después
        // if (dataToUpdate.avatar) dbData.avatar_url = dataToUpdate.avatar;

        const { data, error } = await supabase
            .from('profile')
            .update(dbData)
            .eq('id', userId)
            .select()
            .single();

        if (error) throw new Error(error.message);

        return {
            id: data.id,
            firstName: data.first_name,
            lastName: data.last_name,
            role: data.role
        };
    }
}