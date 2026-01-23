import { Remote } from "nicola-framework";
import { getCampaigns } from "../controllers/campaigns.controller.js";
import { brief_DB } from "../controllers/brief-db.controller.js";
import { requireAuth } from "../middlewares/AuthMiddleware.js";
import { requireRole } from "../middlewares/roleMiddleware.js";
const CampaignsRoutes = new Remote();

CampaignsRoutes.get("/", getCampaigns);
CampaignsRoutes.post("/create", requireAuth, requireRole(["marketing", "admin"]), brief_DB.Create_Campaing);
export default CampaignsRoutes;
