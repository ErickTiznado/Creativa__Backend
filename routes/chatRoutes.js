import { Remote } from "nicola-framework";
import handleChat from "../controllers/chatController.js";

const RemoteRouter =  new Remote();


RemoteRouter.post('/chat', handleChat)

export default RemoteRouter;