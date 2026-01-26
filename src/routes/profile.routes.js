import { getDesigners } from "../controllers/profiles.controller.js";
import { Remote } from "nicola-framework";

const router = new Remote();

router.get("/designers", getDesigners);

export default router;
