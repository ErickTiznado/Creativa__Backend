export class ResetPasswordUseCase {
    constructor(authAdapter) {
        this.authAdapter = authAdapter;
    }

    async execute(accessToken, newPassword) {
        if (!accessToken) throw new Error('Token requerido');
        if (!newPassword || newPassword.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres');
        await this.authAdapter.resetPassword(accessToken, newPassword);
    }
}
