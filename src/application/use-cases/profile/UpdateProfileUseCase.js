export class UpdateProfileUseCase {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async execute(userId, { firstName, lastName }) {
        if (!firstName && !lastName) {
            throw new Error('Debe proporcionar al menos un campo para actualizar (firstName o lastName)');
        }
        return await this.userRepository.update(userId, { firstName, lastName });
    }
}