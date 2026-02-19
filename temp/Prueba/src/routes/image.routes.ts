import { Router, type Request, type Response } from "express";
import { geminiClient } from "../lib/gemini-client.js";
import { saveImageToDisk } from "../lib/save-image-to-disk.js";

const imageRouter = Router();

interface GenerateImageRequestBody {
  prompt: string;
  aspectRatio?: string;
  imageSize?: string;
  useGoogleSearch?: boolean;
}

interface GeneratedImage {
  base64: string;
  mimeType: string;
  savedPath: string;
}

interface GenerateImageResponseBody {
  text?: string;
  images: GeneratedImage[];
}

imageRouter.post("/generate-image", async (req: Request, res: Response) => {
  const {
    prompt,
    aspectRatio = "16:9",
    imageSize = "2K",
    useGoogleSearch = false,
  } = req.body as GenerateImageRequestBody;

  if (!prompt) {
    res.status(400).json({ error: "The 'prompt' field is required." });
    return;
  }

  try {
    const tools = useGoogleSearch ? [{ googleSearch: {} }] : [];

    const response = await geminiClient.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
      config: {
        imageConfig: {
          aspectRatio,
          imageSize,
        },
        ...(tools.length > 0 && { tools }),
      },
    });

    const resultBody: GenerateImageResponseBody = { images: [] };

    const parts = response.candidates?.[0]?.content?.parts ?? [];

    for (const part of parts) {
      if (part.text) {
        resultBody.text = (resultBody.text ?? "") + part.text;
      }

      if (part.inlineData) {
        const base64 = part.inlineData.data as string;
        const mimeType = part.inlineData.mimeType as string;
        const savedPath = await saveImageToDisk(base64, mimeType, prompt);

        resultBody.images.push({ base64, mimeType, savedPath });
      }
    }

    res.json(resultBody);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error generating image";
    console.error("🔴 Image generation failed:", message);
    res.status(500).json({ error: message });
  }
});

/** Returns the first generated image as raw binary — viewable directly in browser/Postman */
imageRouter.post("/generate-image/raw", async (req: Request, res: Response) => {
  const {
    prompt,
    aspectRatio = "16:9",
    imageSize = "2K",
    useGoogleSearch = false,
  } = req.body as GenerateImageRequestBody;

  if (!prompt) {
    res.status(400).json({ error: "The 'prompt' field is required." });
    return;
  }

  try {
    const tools = useGoogleSearch ? [{ googleSearch: {} }] : [];

    const response = await geminiClient.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
      config: {
        imageConfig: { aspectRatio, imageSize },
        ...(tools.length > 0 && { tools }),
      },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((part) => part.inlineData);

    if (!imagePart?.inlineData) {
      res.status(404).json({ error: "No image was generated." });
      return;
    }

    const base64 = imagePart.inlineData.data as string;
    const mimeType = (imagePart.inlineData.mimeType as string) || "image/jpeg";
    const imageBuffer = Buffer.from(base64, "base64");

    await saveImageToDisk(base64, mimeType, prompt);

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", imageBuffer.length);
    res.send(imageBuffer);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error generating image";
    console.error("🔴 Image generation failed:", message);
    res.status(500).json({ error: message });
  }
});

/** GET endpoint — open directly in browser with query params */
imageRouter.get("/generate-image/preview", async (req: Request, res: Response) => {
  const prompt = req.query.prompt as string | undefined;
  const aspectRatio = (req.query.aspectRatio as string) || "16:9";
  const imageSize = (req.query.imageSize as string) || "2K";

  if (!prompt) {
    res.status(400).json({ error: "The 'prompt' query param is required." });
    return;
  }

  try {
    const response = await geminiClient.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: prompt,
      config: { imageConfig: { aspectRatio, imageSize } },
    });

    const parts = response.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((part) => part.inlineData);

    if (!imagePart?.inlineData) {
      res.status(404).json({ error: "No image was generated." });
      return;
    }

    const base64 = imagePart.inlineData.data as string;
    const mimeType = (imagePart.inlineData.mimeType as string) || "image/jpeg";
    const imageBuffer = Buffer.from(base64, "base64");

    await saveImageToDisk(base64, mimeType, prompt);

    res.setHeader("Content-Type", mimeType);
    res.setHeader("Content-Length", imageBuffer.length);
    res.send(imageBuffer);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error generating image";
    console.error("🔴 Image generation failed:", message);
    res.status(500).json({ error: message });
  }
});

export { imageRouter };
