export const makeAuthController = (loginUseCase, registerUseCase, getProfileUseCase, updateProfileUseCase, resetPasswordUseCase) => {
    return {
        login: async (req, res, next) => {
            try {
                const { email, password } = req.body;
                const result = await loginUseCase.execute({ email, password });
                res.status(200).json(result);
            } catch (error) {
                res.status(401).json({ error: error.message });
            }
        },

        register: async (req, res, next) => {
            try {
                // 👇 VERIFICA ESTA LÍNEA: ¿Está "email" escrito aquí?
                const { email, password, firstName, lastName, role } = req.body;

                // 👇 Y AQUÍ TAMBIÉN se pasa "email"
                const result = await registerUseCase.execute({ email, password, firstName, lastName, role });

                res.status(201).json(result);
            } catch (error) {
                // Aquí es donde se atrapa el error "email is not defined" y se manda al Postman
                res.status(400).json({ error: error.message });
            }
        },

        getProfile: async (req, res, next) => {
            try {
                const profile = await getProfileUseCase.execute(req.user.id);
                res.status(200).json(profile);
            } catch (error) {
                res.status(404).json({ error: error.message });
            }
        },

        updateProfile: async (req, res, next) => {
            try {
                const { firstName, lastName } = req.body;
                const updatedProfile = await updateProfileUseCase.execute(req.user.id, { firstName, lastName });
                res.status(200).json(updatedProfile);
            } catch (error) {
                res.status(400).json({ error: error.message });
            }
        },

        resetPassword: async (req, res) => {
            try {
                const { accessToken, newPassword } = req.body;
                await resetPasswordUseCase.execute(accessToken, newPassword);
                res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente' });
            } catch (error) {
                res.status(400).json({ success: false, message: error.message });
            }
        }
    };
};