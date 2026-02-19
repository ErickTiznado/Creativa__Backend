import {
  getAssets,
  updateAsset,
  deleteAsset,
  getAll,
  checkAssets,
  save,
  updateAssets,
manualUpload,
deleteAssets,
} from "../controllers/assets.controller.js";


import { Router } from 'express';


const assetsRoutes = Router()

assetsRoutes.get("/", getAssets);
assetsRoutes.patch("/:id", updateAsset);
assetsRoutes.delete("/:id", deleteAsset);

assetsRoutes.get('/getAll', getAll)
assetsRoutes.get('/check/:campaignId', checkAssets)
assetsRoutes.post('/save', save)
assetsRoutes.post('/updateAssets', updateAssets)
assetsRoutes.delete('/deleteAssets/:assetid', deleteAssets)
assetsRoutes.post('/manualUpload', manualUpload)

export default assetsRoutes;
