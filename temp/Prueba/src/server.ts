import express from "express";
import cors from "cors";
import { PORT } from "./config/environment.js";
import { healthRouter } from "./routes/health.routes.js";
import { imageRouter } from "./routes/image.routes.js";
import { textRouter } from "./routes/text.routes.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "50mb" }));

app.use("/api", healthRouter);
app.use("/api", imageRouter);
app.use("/api", textRouter);

app.listen(PORT, () => {
  console.log(`🚀 Gemini 3 Test Backend running on http://localhost:${PORT}`);
  console.log(`📋 Health:  GET  http://localhost:${PORT}/api/health`);
  console.log(`🖼️  Image:   POST http://localhost:${PORT}/api/generate-image`);
  console.log(`📝 Text:    POST http://localhost:${PORT}/api/generate-text`);
});
