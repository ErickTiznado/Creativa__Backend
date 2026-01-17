import { ingestManual } from "../controllers/RagController";
import { Remote } from "nicola-framework";

const RagRoute = new Remote();

RagRoute.post('/ingestManual', ingestManual);

export default RagRoute;