export class AdminUserRepositoryPort {
    async listUsers()                        { throw new Error('Not implemented'); }
    async createUser(userData)               { throw new Error('Not implemented'); }
    async updateUser(userId, data)           { throw new Error('Not implemented'); }
    async deleteUser(userId)                 { throw new Error('Not implemented'); }
    async toggleUserStatus(userId, isActive) { throw new Error('Not implemented'); }
}
