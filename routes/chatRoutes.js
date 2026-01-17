import { Remote } from "nicola-framework";
import handleChat from "../src/app/controllers/BriefChatController.js";
import Brief from "../src/app/model/Brief.model.js";
import { brief_DB } from "../src/app/controllers/Brief_BD_save.js";

const RemoteRoute = new Remote()


RemoteRoute.post('/chat', handleChat)
RemoteRoute.post("/createCampaing", brief_DB.Registrar_Brief);
export default RemoteRoute