import { Remote } from "nicola-framework";
import { getAssets } from "../controllers/assets.controller.js";

const assetsRoutes = new Remote();

assetsRoutes.get("/", getAssets);

export default assetsRoutes;
