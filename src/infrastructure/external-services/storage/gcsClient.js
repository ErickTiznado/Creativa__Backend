import { Storage } from "@google-cloud/storage";
import dotenv from "dotenv";
dotenv.config();

const credencialesGoogle = JSON.parse(process.env.GOOGLE_CREDS_JSON);

const storage = new Storage({
  projectId: process.env.GOOGLE_PROJECT_ID,
  credentials: credencialesGoogle,
});

export default storage;
