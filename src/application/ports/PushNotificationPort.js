class PushNotificationPort {
    async sendNotification(subscription, payload) {
        throw new Error('ERR_METHOD_NOT_IMPLEMENTED');
    }
}

export default PushNotificationPort;
