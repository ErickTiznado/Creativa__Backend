import webpush from 'web-push';
import PushNotificationPort from '../../../application/ports/PushNotificationPort.js';

class WebPushAdapter extends PushNotificationPort {
    constructor() {
        super();
        const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
        if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) {
            console.warn('[WebPushAdapter] VAPID keys no configuradas. Push notifications deshabilitadas.');
            this.enabled = false;
            return;
        }
        webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
        this.enabled = true;
    }

    async sendNotification(subscription, payload) {
        if (!this.enabled) return;
        try {
            await webpush.sendNotification(subscription, JSON.stringify(payload));
        } catch (error) {
            if (error.statusCode === 410 || error.statusCode === 404) {
                const err = new Error('PUSH_SUBSCRIPTION_EXPIRED');
                err.endpoint = subscription.endpoint;
                throw err;
            }
            throw new Error(`Error enviando push notification: ${error.message}`);
        }
    }
}

export default WebPushAdapter;
