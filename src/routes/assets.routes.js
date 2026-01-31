import { Remote } from "nicola-framework";
import {
  getAssets,
  updateAsset,
  deleteAsset,
} from "../controllers/assets.controller.js";

const assetsRoutes = new Remote();

assetsRoutes.get("/", getAssets);
assetsRoutes.patch("/:id", updateAsset);
assetsRoutes.delete("/:id", deleteAsset);

export default assetsRoutes;
