import VertexVectorizationService from '../../ai/VertexVectorizationService.js';

class CampaignController {
    constructor(registerCampaignUseCase, updateCampaignStatusUseCase, getCampaignsByDesignerUseCase, getCampaignDetailsUseCase, getAllCampaignsUseCase, notificationService = null) {
        this.registerCampaignUseCase = registerCampaignUseCase;
        this.updateCampaignStatusUseCase = updateCampaignStatusUseCase;
        this.getCampaignsByDesignerUseCase = getCampaignsByDesignerUseCase;
        this.getCampaignDetailsUseCase = getCampaignDetailsUseCase;
        this.getAllCampaignsUseCase = getAllCampaignsUseCase;
        this.notificationService = notificationService;

        // 1. Instanciamos tu servicio de IA
        this.vectorizationService = new VertexVectorizationService();
    }

    // Tarea 1: Registrar
    register = async (req, res) => {
        try {
            const { user_id, data, designer_id, idCampaing } = req.body;

            // 2. Guardamos la campaña en la base de datos (como ya lo hacías)
            const result = await this.registerCampaignUseCase.execute({
                user_id,
                data,
                designer_id,
                idCampaing
            });

            // 3. EL FIX MÁGICO: Disparamos la vectorización
            // Buscamos el ID que acaba de generar tu UseCase o el que mandó el frontend
            const newCampaignId = result?.id || result?.data?.id || idCampaing;

            if (newCampaignId && data) {
                console.log(`\n[CampaignController] 🧠 Iniciando vectorización en segundo plano para: [${newCampaignId}]`);

                // Lo llamamos SIN "await" para que no bloquee la pantalla de carga del usuario. ¡Fire and forget!
                this.vectorizationService.vectorizeCampaign(newCampaignId, data).catch(err => {
                    console.error("[CampaignController] ❌ Error en la vectorización silenciosa:", err);
                });
            }

            if (designer_id && newCampaignId && this.notificationService) {
                console.log(`\n[CampaignController] Enviando push notification al diseñador: [${designer_id}]`);
                this.notificationService
                    .notifyDesignerNewCampaign(designer_id, newCampaignId, data)
                    .catch(err => console.error('[CampaignController] Error en la notificación push silenciosa:', err));
            }

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
            const result = await this.updateCampaignStatusUseCase.execute({ campaignId, status });
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
            return res.status(400).json({ success: false, message: error.message });
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
            return res.status(400).json({ success: false, message: error.message });
        }
    };

    // Tarea 5: Obtener todas las campañas
    getAll = async (req, res) => {
        try {
            const result = await this.getAllCampaignsUseCase.execute();
            return res.status(200).json(result);
        } catch (error) {
            console.error('[CampaignController] Error al obtener todas las campañas:', error);
            return res.status(400).json({ success: false, message: error.message });
        }
    };
}

export default CampaignController;