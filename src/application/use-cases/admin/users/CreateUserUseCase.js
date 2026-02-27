export class CreateUserUseCase {
    constructor(adminUserRepository) {
        this.adminUserRepository = adminUserRepository;
    }

    async execute({ email, password, firstName, lastName, role }) {
        if (!email || !password || !firstName || !lastName || !role) {
            throw new Error('Faltan campos requeridos: email, password, firstName, lastName, role');
        }
        const allowedRoles = ['marketing', 'designer'];
        if (!allowedRoles.includes(role)) {
            throw new Error(`Rol inválido. Roles permitidos: ${allowedRoles.join(', ')}`);
        }
        return await this.adminUserRepository.createUser({ email, password, firstName, lastName, role });
    }
}
