export class CreateRequestUseCase {
    constructor(recoveryRequestRepository) {
        this.recoveryRequestRepository = recoveryRequestRepository;
    }

    async execute({ userEmail, firstName, lastName, role, requestType, message }) {
        if (!userEmail || !firstName || !requestType) {
            throw new Error('Faltan campos requeridos: userEmail, firstName, requestType');
        }
        const allowedTypes = ['password', 'email', 'both'];
        if (!allowedTypes.includes(requestType)) {
            throw new Error(`Tipo de solicitud inválido. Valores permitidos: ${allowedTypes.join(', ')}`);
        }
        return await this.recoveryRequestRepository.createRequest({
            userEmail, firstName, lastName, role, requestType, message
        });
    }
}
