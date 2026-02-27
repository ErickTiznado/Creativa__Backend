export class RecoveryRequestRepositoryPort {
    async listRequests()                                      { throw new Error('Not implemented'); }
    async createRequest(requestData)                          { throw new Error('Not implemented'); }
    async updateRequestStatus(requestId, status, adminNotes) { throw new Error('Not implemented'); }
}
