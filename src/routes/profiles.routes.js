import { getDesigners, getDesignerById } from "../controllers/designers.controller.js";
import Remote from "nicola-framework";


const remoteRoute = new Remote();

remoteRoute.get("/", getDesigners);



export default remoteRoute;
