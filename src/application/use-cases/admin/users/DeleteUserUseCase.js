export class DeleteUserUseCase {
    constructor(adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }

    async execute(userId) {
        if (!userId) throw new Error('ID de usuario requerido');
        return await this.adminUserRepository.deleteUser(userId);
    }
}
