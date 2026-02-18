import ProfileRepositoryPort from '../../../application/ports/ProfileRepositoryPort.js';
import supabase from './supabaseClient.js';

class SupabaseProfileRepository extends ProfileRepositoryPort {
    async findDesigners() {
        const { data, error } = await supabase
            .schema('devschema')
            .from('profile')
            .select('*')
            .eq('role', 'designer');

        if (error) {
            throw new Error(`Error buscando diseñadores en Supabase: ${error.message}`);
        }

        return data || [];
    }
}

export default SupabaseProfileRepository;
