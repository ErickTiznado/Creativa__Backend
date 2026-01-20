import testPost from "../controllers/testController.js";
import { Remote } from "nicola-framework";

const testRoutes = new Remote();

testRoutes.post("/test", testPost);

export default testRoutes;
