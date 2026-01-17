import { Remote } from "nicola-framework";
import handleChat from "../controllers/BriefChatController.js";


import { brief_DB } from "../controllers/Brief_BD_save.js";

const RemoteRoute = new Remote()


RemoteRoute.post('/chat', handleChat)
RemoteRoute.post("/createCampaing", brief_DB.Create_Campaing);
RemoteRoute.post("/updateCampaing", brief_DB.updateDataBrief);
export default RemoteRoute