export class UpdateUserUseCase {
    constructor(adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }

    async execute(userId, data) {
        if (!userId) throw new Error('ID de usuario requerido');
        return await this.adminUserRepository.updateUser(userId, data);
    }
}
