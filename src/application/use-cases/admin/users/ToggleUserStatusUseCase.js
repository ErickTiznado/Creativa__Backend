export class ToggleUserStatusUseCase {
    constructor(adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }

    async execute(userId, isActive) {
        if (!userId) throw new Error('ID de usuario requerido');
        if (typeof isActive !== 'boolean') throw new Error('isActive debe ser un valor booleano');
        return await this.adminUserRepository.toggleUserStatus(userId, isActive);
    }
}
