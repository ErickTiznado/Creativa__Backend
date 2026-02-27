class NotificationController {
    constructor(pushSubscriptionRepository, pushNotificationAdapter) {
        this.repo    = pushSubscriptionRepository;
        this.adapter = pushNotificationAdapter;
    }

    // POST /notifications/subscribe — requiere auth
    subscribe = async (req, res) => {
        try {
            const userId           = req.user.id;
            const { subscription } = req.body;
            if (!subscription?.endpoint || !subscription?.keys) {
                return res.status(400).json({ success: false, message: 'Suscripción inválida. Se requiere { endpoint, keys }' });
            }
            const saved = await this.repo.save(userId, subscription);
            return res.status(201).json({ success: true, data: { id: saved.id } });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    // DELETE /notifications/unsubscribe — requiere auth
    unsubscribe = async (req, res) => {
        try {
            const userId       = req.user.id;
            const { endpoint } = req.body;
            if (!endpoint) return res.status(400).json({ success: false, message: 'Se requiere el endpoint' });
            await this.repo.delete(userId, endpoint);
            return res.status(200).json({ success: true });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    // GET /notifications/vapid-public-key — pública
    getVapidPublicKey = async (req, res) => {
        const key = process.env.VAPID_PUBLIC_KEY;
        if (!key) return res.status(500).json({ success: false, message: 'VAPID_PUBLIC_KEY no configurada' });
        return res.status(200).json({ success: true, data: { vapidPublicKey: key } });
    };

    // POST /notifications/test — requiere auth, envía push de prueba al usuario actual
    test = async (req, res) => {
        try {
            const userId = req.user.id;
            const subs = await this.repo.findByUserId(userId);

            if (!subs.length) {
                return res.status(404).json({ success: false, message: 'No tienes suscripciones push registradas. Activa las notificaciones primero.' });
            }

            const payload = {
                title: 'Notificación de prueba',
                body: '¡Las notificaciones push funcionan correctamente!',
                icon: '/vite.svg',
                data: { url: '/' },
            };

            const results = await Promise.allSettled(
                subs.map(row => this.adapter.sendNotification(row.subscription, payload))
            );

            const sent = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;

            return res.status(200).json({
                success: true,
                message: `Push enviado a ${sent} suscripción(es). Fallos: ${failed}.`,
            });
        } catch (error) {
            return res.status(500).json({ success: false, message: error.message });
        }
    };
}

export default NotificationController;
