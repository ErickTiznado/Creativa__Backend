import { Remote } from "nicola-framework";
import { submitRating, reportIssue } from "../controllers/FeedbackController.js";
import { requireAuth } from "../middlewares/AuthMiddleware.js"; 

const router = new Remote();

router.post("/submit", requireAuth, submitRating);

router.post("/report", requireAuth, reportIssue);

export default router;