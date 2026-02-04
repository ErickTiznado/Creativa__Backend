import ChatSession from "../model/ChatSession.model.js";

export const getChatSessionById = async (req, res) => {
  const { id } = req.params;
  const chatSession = await ChatSession.where("id", id).get();
  res.json(chatSession);
};

const updateChatSession = async (req, res) => {
  const { id } = req.params;
  const { chat, userId, campings_id } = req.body;
  const chatSession = await ChatSession.where("id", id).update({
    chat,
    userId,
    campings_id,
  });
  res.json(chatSession);
};

export const getChatSessionByCampaignId = async (req, res) => {
  const { campaignId } = req.query;
  try {
    const chatSession = await ChatSession.where("campings_id", campaignId).get();
    res.json(chatSession);
  } catch (error) {
    res.status(500).json({ message: "Error fetching chat session", error: error.message });
  }
};
