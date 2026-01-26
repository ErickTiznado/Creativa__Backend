import { Remote } from "nicola-framework";
import { saveToStorage } from "../controllers/GeneratorController.js";

const router = new Remote();

router.post("/save", saveToStorage);
router.post("/refine", refineAsset);

export default router;