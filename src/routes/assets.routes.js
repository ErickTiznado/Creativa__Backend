import { Remote } from "nicola-framework";
import {
  getAssets,
  updateAsset,
  deleteAsset,
  getAll,
  checkAssets,
  save,
} from "../controllers/assets.controller.js";

const assetsRoutes = new Remote();

assetsRoutes.get("/", getAssets);
assetsRoutes.patch("/:id", updateAsset);
assetsRoutes.delete("/:id", deleteAsset);

assetsRoutes.get('/getAll', getAll)
assetsRoutes.get('/check/:campaignId', checkAssets)
assetsRoutes.post('/save', save)

export default assetsRoutes;
