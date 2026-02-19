class ProfileController {
    constructor(getDesignersUseCase) {
        this.getDesignersUseCase = getDesignersUseCase;
    }

    getDesigners = async (req, res) => {
        try {
            const result = await this.getDesignersUseCase.execute();
            return res.status(200).json(result);
        } catch (error) {
            console.error('[ProfileController] Error al obtener diseñadores:', error);
            return res.status(500).json({
                success: false,
                message: error.message
            });
        }
    };
}

export default ProfileController;
