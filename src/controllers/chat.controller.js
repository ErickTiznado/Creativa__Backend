import ChatSession from "../model/ChatSession.model.js";

export const getChatSessionById = async (req, res) => {
  const { id } = req.params;
  const chatSession = await ChatSession.where("id", id).get();
  res.json(chatSession);
};

export const updateChatSession = async (req, res) => {
  const { id } = req.params;
  const { chat, userId, campings_id } = req.body;

  console.log(`[UpdateChatSession] ID: ${id}`);
  console.log(`[UpdateChatSession] Payload:`, req.body);

  const dataToUpdate = {};
  if (chat) dataToUpdate.chat = chat;
  if (userId) dataToUpdate['"userId"'] = userId;
  if (campings_id) dataToUpdate.campings_id = campings_id;

  try {
    const chatSession = await ChatSession.where("id", id).update(dataToUpdate);
    res.json(chatSession);
  } catch (error) {
    console.error("[UpdateChatSession] Error:", error);
    res.statusCode = 500;
    res.json({ message: "Error updating chat session", error: error.message });
  }
};

export const getChatSessionByCampaignId = async (req, res) => {
  const campaignId = req.params.campaignId || req.query.campaignId;
  try {
    const chatSession = await ChatSession.where(
      "campings_id",
      campaignId,
    ).get();
    res.json(chatSession);
  } catch (error) {
    res.statusCode = 500;
    res.json({ message: "Error fetching chat session", error: error.message });
  }
};
