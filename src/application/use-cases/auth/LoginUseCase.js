export class LoginUseCase {
    constructor(authAdapter, userRepository = null) {
        this.authAdapter = authAdapter;
        this.userRepository = userRepository;
    }

    async execute({ email, password }) {
        if (!email || !password) throw new Error('Email y password son requeridos');

        const result = await this.authAdapter.login(email, password);

        // Verificar si la cuenta está deshabilitada
        if (this.userRepository && result.user) {
            const profile = await this.userRepository.findById(result.user.id);
            if (profile && profile.is_active === false) {
                throw new Error('Tu cuenta está deshabilitada. Contacta al administrador.');
            }
        }

        return result;
    }
}