class PushSubscriptionRepositoryPort {
    async save(userId, subscription)  { throw new Error('ERR_METHOD_NOT_IMPLEMENTED'); }
    async delete(userId, endpoint)    { throw new Error('ERR_METHOD_NOT_IMPLEMENTED'); }
    async findByUserId(userId)        { throw new Error('ERR_METHOD_NOT_IMPLEMENTED'); }
}

export default PushSubscriptionRepositoryPort;
