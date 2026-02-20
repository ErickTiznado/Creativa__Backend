import getModel from '../../ai/GeminiConfig.js';

class ChatController {
    constructor(chatRepository) {
        this.chatRepository = chatRepository;
    }

    getChatSessionByCampaignId = async (req, res) => {
        const idToSearch = req.params.campaignId || req.query.campaignId;
        try {
            console.log(`\n[ChatController] 📡 Buscando chat para el ID: [${idToSearch}]`);

            // 1. Buscar por ID de Campaña
            let chatSessions = await this.chatRepository.getByCampaignId(idToSearch);

            // 2. Fallback: Buscar por Session ID (Borrador)
            if (!chatSessions || chatSessions.length === 0) {
                try {
                    const sessionById = await this.chatRepository.getById(idToSearch);
                    if (sessionById) {
                        console.log(`[ChatController] 💡 ID encontrado como Borrador (Session ID).`);
                        chatSessions = [sessionById];
                    }
                } catch (e) { }
            }

            res.status(200).json(chatSessions || []);
        } catch (error) {
            console.error("[ChatController] ❌ Error fetching chat:", error);
            res.status(500).json({ message: "Error", error: error.message });
        }
    }

    getChatSessionById = async (req, res) => {
        const { id } = req.params;
        try {
            const chatSession = await this.chatRepository.getById(id);
            res.status(200).json(chatSession ? [chatSession] : []);
        } catch (error) {
            console.error("[ChatController] Error fetching by SessionId:", error);
            res.status(500).json({ message: "Error", error: error.message });
        }
    }

    updateChatSession = async (req, res) => {
        const { id } = req.params;

        console.log(`\n[ChatController] 🔄 Recibiendo petición PUT para vincular chat...`);
        console.log(`[ChatController] 🆔 Session ID (Borrador):`, id);
        console.log(`[ChatController] 📦 BODY crudo recibido del frontend:`, req.body);

        // Buscamos todas las formas posibles en las que tu service pudo haber mandado el ID
        const incomingCampaignId = req.body.campings_id || req.body.campaignId || req.body.campaign_id || req.body.id_campaing;
        console.log(`[ChatController] 🎯 ID de Campaña extraído:`, incomingCampaignId || "¡NINGUNO! (Llegó vacío)");

        try {
            let existingSession = null;
            try {
                existingSession = await this.chatRepository.getById(id);
                console.log(`[ChatController] 🕵️‍♂️ Historial viejo encontrado en BD:`, existingSession ? "SÍ" : "NO");
            } catch (e) {
                console.error("[ChatController] Error al buscar sesión existente:", e.message);
            }

            let finalChat = existingSession?.chat || { message: [], data: {} };
            if (req.body.chat && req.body.chat.message && req.body.chat.message.length > 0) {
                finalChat = req.body.chat;
            }

            const payload = {
                id,
                chat: finalChat,
                campings_id: incomingCampaignId || existingSession?.campings_id || null
            };

            const finalUserId = req.body.userId || req.body.user_id || existingSession?.userId;
            if (finalUserId) {
                payload.userId = finalUserId;
            }

            console.log(`[ChatController] 💾 Guardando este Payload EXACTO en Supabase:`, JSON.stringify(payload));

            const updated = await this.chatRepository.upsertSession(payload);
            console.log(`[ChatController] ✅ Update en Supabase exitoso.`);
            res.status(200).json(updated);
        } catch (error) {
            console.error("[ChatController] ❌ Error crítico en updateChatSession:", error);
            res.status(500).json({ message: "Error updating", error: error.message });
        }
    }

    handleChat = async (req, res) => {
        const { sessionID, userMessage, userId, campaignId } = req.body;

        if (!sessionID) {
            return res.status(400).json({ error: "El campo sessionID es obligatorio." });
        }

        try {
            console.log(`\n[ChatController] 🧠 Pensando respuesta para sesión: ${sessionID}...`);

            let sessionRecord = null;
            try {
                sessionRecord = await this.chatRepository.getById(sessionID);
            } catch (e) { }

            let session = sessionRecord?.chat || { message: [], data: {} };

            const currentDataContext = Object.keys(session.data).length > 0
                ? `\n[CONTEXTO - Datos recolectados hasta ahora: ${JSON.stringify(session.data)}]`
                : "";

            session.message.push({ role: "user", parts: [{ text: userMessage + currentDataContext }] });

            // Gemini Modo Función
            const modelFunction = getModel("gemini-2.5-flash", true);
            const responseFunc = await modelFunction.generateContent({ contents: session.message });
            const candidateFunc = responseFunc.response.candidates[0];
            const partFunc = candidateFunc?.content?.parts[0];

            let isCompleted = false;

            if (partFunc?.functionCall?.name === "Campaing_Brief") {
                const args = partFunc.functionCall.args;

                Object.keys(args).forEach(k => {
                    if (k && args[k] && args[k] !== "" && k !== "datos_completos") {
                        session.data[k] = args[k];
                    }
                });
                isCompleted = args.datos_completos;

                session.message.push(candidateFunc.content);
                session.message.push({
                    role: "function",
                    parts: [{ functionResponse: { name: "Campaing_Brief", response: { success: true } } }]
                });
            }

            // Gemini Modo Texto
            const modelText = getModel("gemini-2.5-flash", false);
            const responseText = await modelText.generateContent({ contents: session.message });
            const textReply = responseText.response.candidates[0]?.content?.parts[0]?.text || "Datos guardados. ¿Qué más necesitas?";

            session.message.push(responseText.response.candidates[0].content);

            // Limpieza de Payload
            const sessionPayload = {
                id: sessionID,
                chat: session,
                campings_id: campaignId || sessionRecord?.campings_id || null
            };

            const finalUserId = userId || sessionRecord?.userId;
            if (finalUserId) {
                sessionPayload.userId = finalUserId;
            }

            await this.chatRepository.upsertSession(sessionPayload);

            const briefKeys = ["nombre_campaing", "ContentType", "Description", "Objective", "observations", "publishing_channel", "fechaPublicacion"];
            const missingFields = briefKeys.filter(key => !session.data[key]);

            console.log(`[ChatController] ✅ Respuesta enviada. Faltan ${missingFields.length} campos.`);

            res.status(200).json({
                type: isCompleted ? "completed" : "data_collected",
                text: textReply,
                collectedData: session.data,
                missingFields: missingFields,
                success: true
            });

        } catch (error) {
            console.error("[ChatController] ❌ Error crítico en IA:", error);
            res.status(500).json({ error: "No se pudo procesar la solicitud con la IA." });
        }
    }
}

export default ChatController;