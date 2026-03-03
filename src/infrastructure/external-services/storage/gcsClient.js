import { Storage } from "@google-cloud/storage";
import dotenv from "dotenv";
dotenv.config();

// Support both a JSON string inline (GOOGLE_CREDS_JSON) or a file path
// via GOOGLE_APPLICATION_CREDENTIALS (picked up automatically by the SDK).
const storageOptions = { projectId: process.env.GOOGLE_PROJECT_ID };
if (process.env.GOOGLE_CREDS_JSON) {
    storageOptions.credentials = JSON.parse(process.env.GOOGLE_CREDS_JSON);
}

const storage = new Storage(storageOptions);

export default storage;