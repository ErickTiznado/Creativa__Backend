export class UpdateRequestStatusUseCase {
    constructor(recoveryRequestRepository) {
        this.recoveryRequestRepository = recoveryRequestRepository;
    }

    async execute(requestId, status, adminNotes) {
        if (!requestId) throw new Error('ID de solicitud requerido');
        const allowedStatuses = ['accepted', 'rejected'];
        if (!allowedStatuses.includes(status)) {
            throw new Error(`Estado inválido. Valores permitidos: ${allowedStatuses.join(', ')}`);
        }
        return await this.recoveryRequestRepository.updateRequestStatus(requestId, status, adminNotes);
    }
}
