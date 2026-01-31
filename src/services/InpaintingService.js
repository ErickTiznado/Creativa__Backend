import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import GeminiService from "./GeminiService.js";
import ImageStorageService from "./ImageStorageService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Service specifically for Image Inpainting / Editing
 * Separates concerns from GeneratorController
 */
class InpaintingService {
  constructor() {
    // No longer dependent on vertexAdapter directly for this operation
  }

  /**
   * Loads local reference images from src/references
   * @returns {Promise<string[]>} Array of base64 strings
   */
  async _loadLocalReferences() {
    try {
      const referencesDir = path.join(__dirname, "../references");
      // Check if directory exists
      try {
        await fs.access(referencesDir);
      } catch {
        console.warn(
          `[InpaintingService] References directory not found at ${referencesDir}`,
        );
        return [];
      }

      const files = await fs.readdir(referencesDir);
      const imageFiles = files.filter((file) =>
        /\.(png|jpg|jpeg|webp)$/i.test(file),
      );

      const loadedRefs = [];
      for (const file of imageFiles) {
        const filePath = path.join(referencesDir, file);
        const buffer = await fs.readFile(filePath);
        const b64 = buffer.toString("base64");
        // Check mime type simply by extension for now
        // GeminiService expects pure base64 (it cleans prefix), or we can send without prefix.
        // GeminiService.editImageWithMask does: refBase64.replace(/^data:image\/\w+;base64,/, "")
        // So we can send raw base64 or prefixed. Let's send raw to be safe, or prefixed.
        // The existing code removes prefix if present. Logic: replace(...) returns string.
        // If no prefix, it returns original. So raw base64 is fine.
        loadedRefs.push(b64);
      }
      console.log(
        `[InpaintingService] Loaded ${loadedRefs.length} local references.`,
      );
      return loadedRefs;
    } catch (error) {
      console.error(
        `[InpaintingService] Error loading local references: ${error.message}`,
      );
      return [];
    }
  }

  /**
   * Process an inpainting request
   * @param {Object} params
   * @param {string} params.assetId - ID of the base asset to edit
   * @param {string} params.prompt - Instruction for the edit
   * @param {string} params.maskImage - Base64 string of the mask
   * @param {string} params.brandId - ID of the user/brand
   * @param {string[]} [params.referenceImages] - Optional frontend references
   * @returns {Promise<Object>} The new asset data
   */
  async processInpainting({
    assetId,
    prompt,
    maskImage,
    brandId,
    referenceImages = [],
  }) {
    // 0. Load Local References
    const localRefs = await this._loadLocalReferences();
    // Merge frontend refs and local refs.
    // Frontend refs should probably take precedence or be appended?
    // Expectation: "Use ALSO local images". So we combine them.
    const allReferences = [...referenceImages, ...localRefs];

    // 1. Fetch Source Image
    const sourceAsset = await ImageStorageService.getAssetById(assetId);

    if (!sourceAsset) {
      throw new Error(`Asset not found: ${assetId}`);
    }

    // 2. Prepare Options
    // Ensure mask is clean (remove header if present)
    const cleanMask = maskImage.replace(/^data:image\/\w+;base64,/, "");

    // Download source image as base64 (needed for GeminiService)
    // We can reuse fetchAssetsAsGeminiParts from ImageStorageService OR simple fetch.
    // Let's use fetchAssetsAsGeminiParts logic but simplified or call it.
    // Actually, ImageStorageService doesn't have a simple "downloadAsBase64" public method easily accessible for one item without wrapping.
    // Let's use GeminiService._processReferenceImages if accessible, or just manual download.
    // Better: use the logic from within InpaintingService or import axios.
    // Let's rely on ImageStorageService.fetchAssetsAsGeminiParts which already does download logic,
    // but it returns an array of parts.

    const { parts } = await ImageStorageService.fetchAssetsAsGeminiParts([
      assetId,
    ]);
    if (!parts || parts.length === 0)
      throw new Error("Could not download source image");

    const sourceBase64 = parts[0].inlineData.data;

    // 3. Call GeminiService (Nano Banana implementation)
    const result = await GeminiService.editImageWithMask(
      prompt,
      sourceBase64,
      cleanMask,
      allReferences,
    );

    if (!result || !result.buffer) {
      throw new Error("Failed to generate edited image");
    }

    // 4. Save/Register the new asset
    const savedAsset = await ImageStorageService.processAndSaveImage({
      buffer: result.buffer,
      campaignId: sourceAsset.campaign_assets || "edited-assets",
      prompt: prompt,
      parentAssetId: assetId,
      isDraft: true,
    });

    if (result.text) {
      savedAsset.text_comment = result.text;
    }

    return savedAsset;
  }
}

export default new InpaintingService();
