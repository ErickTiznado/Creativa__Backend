class CampaignController {
    constructor(registerCampaignUseCase, updateCampaignStatusUseCase, getCampaignsByDesignerUseCase, getCampaignDetailsUseCase, getAllCampaignsUseCase) {
        this.registerCampaignUseCase = registerCampaignUseCase;
        this.updateCampaignStatusUseCase = updateCampaignStatusUseCase;
        this.getCampaignsByDesignerUseCase = getCampaignsByDesignerUseCase;
        this.getCampaignDetailsUseCase = getCampaignDetailsUseCase;
        this.getAllCampaignsUseCase = getAllCampaignsUseCase;
    }

    // Tarea 1: Registrar
    register = async (req, res) => {
        try {
            const { user_id, data, designer_id, idCampaing } = req.body;
            const result = await this.registerCampaignUseCase.execute({
                user_id,
                data,
                designer_id,
                idCampaing
            });
            return res.status(201).json(result);
        } catch (error) {
            console.error('[CampaignController] Error al registrar campaña:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    };

    // Tarea 2: Actualizar Estado
    updateState = async (req, res) => {
        try {
            const { campaignId, status } = req.body;

            const result = await this.updateCampaignStatusUseCase.execute({
                campaignId,
                status
            });

            return res.status(200).json(result);
        } catch (error) {
            console.error('[CampaignController] Error al actualizar estado:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    };

    // Tarea 3: Obtener campañas por diseñador
    getByDesigner = async (req, res) => {
        try {
            const { designerId } = req.query;

            const result = await this.getCampaignsByDesignerUseCase.execute(designerId);

            return res.status(200).json({
                success: true,
                message: "Campañas obtenidas con éxito",
                data: result.data
            });
        } catch (error) {
            console.error('[CampaignController] Error al obtener campañas por diseñador:', error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };

    // Tarea 4: Obtener detalles de campaña por diseñador
    getById = async (req, res) => {
        try {

            const { campaignId, designerId } = req.query;

            const result = await this.getCampaignDetailsUseCase.execute({ campaignId, designerId });

            return res.status(200).json({
                success: true,
                message: "Ok",
                data: result.data
            });
        } catch (error) {
            console.error('[CampaingController] Error al obtener detalles:', error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };

    // Tarea 5: Obtener todas las campañas
    getAll = async (req, res) => {
        try {
            const result = await this.getAllCampaignsUseCase.execute();
            return res.status(200).json(result);
        } catch (error) {
            console.error('[CampaignController] Error al obtener todas las campañas:', error);
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
    };
}

export default CampaignController;