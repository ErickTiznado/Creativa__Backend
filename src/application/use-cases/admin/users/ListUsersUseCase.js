export class ListUsersUseCase {
    constructor(adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }

    async execute() {
        return await this.adminUserRepository.listUsers();
    }
}
