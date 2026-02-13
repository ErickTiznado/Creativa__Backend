export class RegisterUseCase {
    constructor(authAdapter) {
        this.authAdapter = authAdapter;
    }

    // 👇 OJO AQUÍ: Asegúrate de que "email" esté dentro de estas llaves
    async execute({ email, password, firstName, lastName, role }) {

        // Si aquí usas "email" pero arriba no lo pusiste, da el error "email is not defined"
        if (!email || !password || !firstName || !lastName || !role) {
            throw new Error('Faltan campos requeridos (email, password, firstName, lastName, role)');
        }

        const allowedRoles = ['marketing', 'designer', 'admin', 'user'];
        if (!allowedRoles.includes(role)) throw new Error('Rol inválido');

        return await this.authAdapter.register(email, password, {
            first_name: firstName,
            last_name: lastName,
            role
        });
    }
}