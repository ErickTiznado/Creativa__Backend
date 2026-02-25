import PushSubscriptionRepositoryPort from '../../../application/ports/PushSubscriptionRepositoryPort.js';
import supabase from './supabaseClient.js';

class SupabasePushSubscriptionRepository extends PushSubscriptionRepositoryPort {
    async save(userId, subscription) {
        const endpoint = subscription.endpoint;

        // Eliminar suscripción previa del mismo endpoint (el constraint funcional
        // no es compatible con upsert de PostgREST, así que delete+insert es más seguro)
        await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .filter('subscription->>endpoint', 'eq', endpoint);

        const { data, error } = await supabase
            .from('push_subscriptions')
            .insert({ user_id: userId, subscription })
            .select()
            .single();

        if (error) throw new Error(`Error guardando suscripción push: ${error.message}`);
        return data;
    }

    async delete(userId, endpoint) {
        const { error } = await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', userId)
            .filter('subscription->>endpoint', 'eq', endpoint);
        if (error) throw new Error(`Error eliminando suscripción push: ${error.message}`);
        return true;
    }

    async findByUserId(userId) {
        const { data, error } = await supabase
            .from('push_subscriptions')
            .select('*')
            .eq('user_id', userId);
        if (error) throw new Error(`Error buscando suscripciones push: ${error.message}`);
        return data || [];
    }
}

export default SupabasePushSubscriptionRepository;
