export class LoginUseCase {
    constructor(authAdapter) {
        this.authAdapter = authAdapter;
    }

    async execute({ email, password }) {
        if (!email || !password) throw new Error('Email y password son requeridos');
        return await this.authAdapter.login(email, password);
    }
}