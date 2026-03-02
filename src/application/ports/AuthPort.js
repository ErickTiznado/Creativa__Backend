export class AuthPort {
    async login(email, password) { throw new Error('Not implemented'); }
    async register(email, password, metadata) { throw new Error('Not implemented'); }
    async verifyToken(token) { throw new Error('Not implemented'); }
    async sendPasswordReset(email, redirectTo) { throw new Error('Not implemented'); }
    async resetPassword(accessToken, newPassword) { throw new Error('Not implemented'); }
}