import { Remote } from "nicola-framework";
import handleChat from "../src/app/controllers/BriefChatController.js";
const RemoteRoute = new Remote()


RemoteRoute.post('/chat', handleChat)

export default RemoteRoute