import { Remote } from "nicola-framework";
import { getAssets, deleteAsset } from "../controllers/assets.controller.js";

const assetsRoutes = new Remote();

assetsRoutes.get("/", getAssets);
assetsRoutes.delete("/:id", deleteAsset);

export default assetsRoutes;
