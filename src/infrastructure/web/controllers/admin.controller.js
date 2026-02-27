class AdminController {
    constructor(
        listUsersUseCase,
        createUserUseCase,
        updateUserUseCase,
        deleteUserUseCase,
        toggleUserStatusUseCase,
        listRequestsUseCase,
        createRequestUseCase,
        updateRequestStatusUseCase
    ) {
        this.listUsersUseCase = listUsersUseCase;
        this.createUserUseCase = createUserUseCase;
        this.updateUserUseCase = updateUserUseCase;
        this.deleteUserUseCase = deleteUserUseCase;
        this.toggleUserStatusUseCase = toggleUserStatusUseCase;
        this.listRequestsUseCase = listRequestsUseCase;
        this.createRequestUseCase = createRequestUseCase;
        this.updateRequestStatusUseCase = updateRequestStatusUseCase;
    }

    // ── USUARIOS ─────────────────────────────────────────────────────────────

    listUsers = async (req, res) => {
        try {
            const users = await this.listUsersUseCase.execute();
            return res.status(200).json({ success: true, data: users });
        } catch (error) {
            console.error('[AdminController] Error al listar usuarios:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    createUser = async (req, res) => {
        try {
            const { email, password, firstName, lastName, role } = req.body;
            const user = await this.createUserUseCase.execute({ email, password, firstName, lastName, role });
            return res.status(201).json({ success: true, data: user });
        } catch (error) {
            console.error('[AdminController] Error al crear usuario:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    };

    updateUser = async (req, res) => {
        try {
            const { id } = req.params;
            const { firstName, lastName, role } = req.body;
            const user = await this.updateUserUseCase.execute(id, { firstName, lastName, role });
            return res.status(200).json({ success: true, data: user });
        } catch (error) {
            console.error('[AdminController] Error al actualizar usuario:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    };

    deleteUser = async (req, res) => {
        try {
            const { id } = req.params;
            await this.deleteUserUseCase.execute(id);
            return res.status(200).json({ success: true, message: 'Usuario eliminado correctamente' });
        } catch (error) {
            console.error('[AdminController] Error al eliminar usuario:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    };

    toggleUserStatus = async (req, res) => {
        try {
            const { id } = req.params;
            const { is_active } = req.body;
            if (typeof is_active !== 'boolean') {
                return res.status(400).json({ success: false, message: 'is_active debe ser un valor booleano' });
            }
            const user = await this.toggleUserStatusUseCase.execute(id, is_active);
            return res.status(200).json({ success: true, data: user });
        } catch (error) {
            console.error('[AdminController] Error al cambiar estado del usuario:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    };

    // ── SOLICITUDES DE RECUPERACIÓN ──────────────────────────────────────────

    listRequests = async (req, res) => {
        try {
            const requests = await this.listRequestsUseCase.execute();
            return res.status(200).json({ success: true, data: requests });
        } catch (error) {
            console.error('[AdminController] Error al listar solicitudes:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    };

    createRequest = async (req, res) => {
        try {
            const { userEmail, firstName, lastName, role, requestType, message } = req.body;
            const request = await this.createRequestUseCase.execute({
                userEmail, firstName, lastName, role, requestType, message
            });
            return res.status(201).json({ success: true, data: request });
        } catch (error) {
            console.error('[AdminController] Error al crear solicitud:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    };

    updateRequestStatus = async (req, res) => {
        try {
            const { id } = req.params;
            const { status, adminNotes } = req.body;
            const request = await this.updateRequestStatusUseCase.execute(id, status, adminNotes);
            return res.status(200).json({ success: true, data: request });
        } catch (error) {
            console.error('[AdminController] Error al actualizar solicitud:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    };
}

export default AdminController;
