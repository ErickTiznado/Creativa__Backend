export class ListRequestsUseCase {
    constructor(recoveryRequestRepository) {
        this.recoveryRequestRepository = recoveryRequestRepository;
    }

    async execute() {
        return await this.recoveryRequestRepository.listRequests();
    }
}
