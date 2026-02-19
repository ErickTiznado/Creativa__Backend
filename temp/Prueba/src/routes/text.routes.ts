import { Router, type Request, type Response } from "express";
import { ThinkingLevel } from "@google/genai";
import { geminiClient } from "../lib/gemini-client.js";

const textRouter = Router();

const THINKING_LEVEL_MAP: Record<string, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
  minimal: ThinkingLevel.MINIMAL,
};

interface GenerateTextRequestBody {
  prompt: string;
  thinkingLevel?: keyof typeof THINKING_LEVEL_MAP;
}

textRouter.post("/generate-text", async (req: Request, res: Response) => {
  const { prompt, thinkingLevel = "high" } = req.body as GenerateTextRequestBody;

  if (!prompt) {
    res.status(400).json({ error: "The 'prompt' field is required." });
    return;
  }

  const resolvedLevel = THINKING_LEVEL_MAP[thinkingLevel] ?? ThinkingLevel.HIGH;

  try {
    const response = await geminiClient.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        thinkingConfig: {
          thinkingLevel: resolvedLevel,
        },
      },
    });

    res.json({ text: response.text ?? "" });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error generating text";
    console.error("🔴 Text generation failed:", message);
    res.status(500).json({ error: message });
  }
});

export { textRouter };
