import { ChatSession } from "../model/ChatSession.model.js";

const getChatSessionById = async (req, res) => {
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
