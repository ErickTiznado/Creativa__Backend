import { RecoveryRequestRepositoryPort } from '../../../application/ports/RecoveryRequestRepositoryPort.js';
import supabase from './supabaseClient.js';

export class SupabaseRecoveryRequestRepository extends RecoveryRequestRepositoryPort {

    async getRequestById(requestId) {
        const { data, error } = await supabase
            .from('recovery_requests')
            .select('*')
            .eq('id', requestId)
            .single();

        if (error) throw new Error(error.message);
        return this.#mapRequest(data);
    }

    async listRequests() {
        const { data, error } = await supabase
            .from('recovery_requests')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw new Error(error.message);
        return data.map(this.#mapRequest);
    }

    async createRequest({ userEmail, firstName, lastName, role, requestType, message }) {
        const { data, error } = await supabase
            .from('recovery_requests')
            .insert({
                user_email: userEmail,
                first_name: firstName,
                last_name: lastName,
                role,
                request_type: requestType,
                message,
                status: 'pending'
            })
            .select()
            .single();

        if (error) throw new Error(error.message);
        return this.#mapRequest(data);
    }

    async updateRequestStatus(requestId, status, adminNotes) {
        const { data, error } = await supabase
            .from('recovery_requests')
            .update({ status, admin_notes: adminNotes })
            .eq('id', requestId)
            .select()
            .single();

        if (error) throw new Error(error.message);
        return this.#mapRequest(data);
    }

    #mapRequest(data) {
        return {
            id: data.id,
            userEmail: data.user_email,
            firstName: data.first_name,
            lastName: data.last_name,
            role: data.role,
            requestType: data.request_type,
            message: data.message,
            status: data.status,
            adminNotes: data.admin_notes,
            createdAt: data.created_at
        };
    }
}
