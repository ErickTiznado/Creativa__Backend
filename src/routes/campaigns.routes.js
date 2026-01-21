import { Remote } from "nicola-framework";
import { getCampaigns } from "../controllers/campaigns.controller.js";

const CampaignsRoutes = new Remote();

CampaignsRoutes.get("/", getCampaigns);

export default CampaignsRoutes;
