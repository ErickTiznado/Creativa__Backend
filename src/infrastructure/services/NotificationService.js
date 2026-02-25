class NotificationService {
    constructor(pushSubscriptionRepository, pushNotificationAdapter) {
        this.repo    = pushSubscriptionRepository;
        this.adapter = pushNotificationAdapter;
    }

    async notifyDesignerNewCampaign(designerId, campaignId, briefData) {
        const subs = await this.repo.findByUserId(designerId);
        if (!subs.length) {
            console.log(`[NotificationService] Diseñador ${designerId} sin suscripciones push.`);
            return;
        }

        const payload = {
            title: 'Nueva campaña asignada',
            body:  'Tienes una nueva campaña. Revisa tu panel.',
            icon:  '/icons/icon-192x192.png',
            data:  { campaignId, url: `/campaigns/${campaignId}` }
        };

        const results = await Promise.allSettled(
            subs.map(row => this.adapter.sendNotification(row.subscription, payload))
        );

        results.forEach((result, i) => {
            if (result.status === 'rejected' && result.reason?.message === 'PUSH_SUBSCRIPTION_EXPIRED') {
                const expiredEndpoint = subs[i].subscription.endpoint;
                console.warn(`[NotificationService] Limpiando suscripción expirada: ${expiredEndpoint}`);
                this.repo.delete(designerId, expiredEndpoint)
                    .catch(err => console.error('[NotificationService] Error limpiando suscripción:', err));
            }
        });

        console.log(`[NotificationService] Notificaciones enviadas al diseñador ${designerId}`);
    }
}

export default NotificationService;
