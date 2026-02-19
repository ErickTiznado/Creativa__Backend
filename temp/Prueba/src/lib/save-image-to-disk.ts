import { writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const GENERATED_DIR = resolve("generated");

/** Map MIME types to file extensions */
function resolveExtension(mimeType: string): string {
  const extensionMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
  };

  return extensionMap[mimeType] ?? "jpg";
}

/** Build a human-readable, collision-free filename */
function buildFilename(prompt: string, mimeType: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sanitizedPrompt = prompt
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .slice(0, 60);
  const extension = resolveExtension(mimeType);

  return `${timestamp}_${sanitizedPrompt}.${extension}`;
}

/**
 * Persists a base64-encoded image to `generated/` directory.
 * Creates the directory if it doesn't exist.
 * @returns Absolute path of the saved file.
 */
export async function saveImageToDisk(
  base64Data: string,
  mimeType: string,
  prompt: string
): Promise<string> {
  await mkdir(GENERATED_DIR, { recursive: true });

  const filename = buildFilename(prompt, mimeType);
  const filePath = join(GENERATED_DIR, filename);
  const imageBuffer = Buffer.from(base64Data, "base64");

  await writeFile(filePath, imageBuffer);
  console.log(`💾 Image saved: ${filePath}`);

  return filePath;
}
