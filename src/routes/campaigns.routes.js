import { Remote } from "nicola-framework";
import { getCampaigns } from "../controllers/campaigns.controller.js";
import { brief_DB } from "../controllers/brief-db.controller.js";
import { getCampaignsDesigners, updateStateCampaign, getCampaingById } from "../controllers/campaigns.controller.js";
const CampaignsRoutes = new Remote();

CampaignsRoutes.get("/", getCampaigns);
CampaignsRoutes.post("/registerCampaigns", brief_DB.Registrar_Brief);
CampaignsRoutes.get("/designers", getCampaignsDesigners);
CampaignsRoutes.put("/updateStateCampaign", updateStateCampaign);
CampaignsRoutes.get("/campaignById", getCampaingById);
export default CampaignsRoutes;
