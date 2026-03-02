export class SendResetLinkUseCase {
    constructor(recoveryRequestRepository, authAdapter, frontendUrl) {
        this.recoveryRequestRepository = recoveryRequestRepository;
        this.authAdapter = authAdapter;
        this.frontendUrl = frontendUrl;
    }

    async execute(requestId) {
        const request = await this.recoveryRequestRepository.getRequestById(requestId);
        if (!request) throw new Error('Solicitud no encontrada');
        if (request.status !== 'pending') throw new Error('La solicitud ya fue procesada');

        const redirectTo = `${this.frontendUrl}/reset-password`;
        await this.authAdapter.sendPasswordReset(request.userEmail, redirectTo);

        return await this.recoveryRequestRepository.updateRequestStatus(
            requestId,
            'accepted',
            'Link de recuperación enviado por email.'
        );
    }
}
