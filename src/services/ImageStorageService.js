import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import path from "path";
import axios from "axios";
import { fileURLToPath } from "url";
import CampaignAsset from "../model/CampaignAsset.model.js";
import { PatternBuilder } from "nicola-framework";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEY_PATH = path.join(__dirname, "../../config/key/creativa-key.json");
const save_location = {
  temp: "temp",
  approved: "approved",
};
const PROJECT_ID =
  process.env.GCP_PROJECT_ID ||
  process.env.GOOGLE_PROJECT_ID ||
  "ugb-creativamkt-484123";
const BUCKET_NAME = process.env.GCS_BUCKET_NAME || "creativa-campaign-assets";

// Inicializar Storage
const storage = new Storage({
  projectId: PROJECT_ID,
  keyFilename: KEY_PATH,
});
const bucket = storage.bucket(BUCKET_NAME);

/**
 * Service for handling image storage and processing.
 * Manages GCS upload and CampaignAsset database records.
 */
class ImageStorageService {
  /**
   * Processes a buffer (resizes, uploads to GCS) and saves to DB.
   *
   * @param {Object} params
   * @param {Buffer} params.buffer - The image buffer
   * @param {string} params.campaignId - ID of the campaign
   * @param {string} params.prompt - Prompt used for generation or empty
   * @param {string} [params.parentAssetId] - Optional parent asset ID for history
   * @returns {Promise<Object>} The created CampaignAsset object
   */
  async processAndSaveImage({
    buffer,
    campaignId,
    prompt,
    parentAssetId = null,
    isDraft = true,
  }) {
    // Detectar formato
    const metadata = await sharp(buffer).metadata();
    const isJpg = metadata.format === "jpeg" || metadata.format === "jpg";
    const contentType = isJpg ? "image/jpeg" : "image/png";
    const ext = isJpg ? "jpeg" : "png";

    const fileUuid = uuidv4();
    const timestamp = Date.now();
    let prefix = save_location.approved;
    if (isDraft) {
      prefix = save_location.temp;
    }
    const fileNameOriginal = `${prefix}/${campaignId}/${fileUuid}_${timestamp}.${ext}`;
    const fileNameThumb = `${prefix}/${campaignId}/${fileUuid}_${timestamp}_thumb.${ext}`;

    // Crear thumbnail
    const thumbBuffer = await sharp(buffer)
      .resize(300)
      .toFormat(ext, { quality: 80 })
      .toBuffer();

    const fileOriginal = bucket.file(fileNameOriginal);
    const fileThumb = bucket.file(fileNameThumb);

    const uploadOptions = {
      metadata: { contentType },
      contentType,
      resumable: false,
    };

    // Subir en paralelo
    await Promise.all([
      fileOriginal.save(buffer, uploadOptions),
      fileThumb.save(thumbBuffer, uploadOptions),
    ]);

    const urlOriginal = `https://storage.googleapis.com/${BUCKET_NAME}/${fileNameOriginal}`;
    const urlThumb = `https://storage.googleapis.com/${BUCKET_NAME}/${fileNameThumb}`;

    const assetJson = { url: urlOriginal, thumbnail: urlThumb };
    const finalCampaignId =
      campaignId && campaignId !== "unsorted-assets"
        ? campaignId
        : "00000000-0000-0000-0000-000000000000";

    const assetData = {
      campaign_assets: finalCampaignId,
      img_url: assetJson,
      prompt_used: prompt || "",
      is_approved: true,
      parent_asset_id: parentAssetId,
      status: isDraft ? "draft" : "approved",
      storage_location: prefix,
      is_approved: isDraft ? false : true,
    };

    // Guardar en base de datos
    const newAsset = await CampaignAsset.create(assetData);
    return {
      ...assetData,
      id: newAsset?.id,
    };
  }

  async approvedAsset(assetId, userId) {
    const assets = await CampaignAsset.where("id", assetId).get();
    const asset = assets[0];
    if (asset.status !== "draft") {
      throw new Error("Asset is not in draft status");
    }
    const urlPrefixPattern = new PatternBuilder()
      .find("https://storage.googleapis.com/")
      .find(BUCKET_NAME)
      .find("/");

    const assetUrl = urlPrefixPattern.replace(asset.img_url.url, "");

    const assetThumbnail = urlPrefixPattern.replace(
      asset.img_url.thumbnail,
      "",
    );
    const newUrl = assetUrl.replace(save_location.temp, save_location.approved);
    const newThumbnail = assetThumbnail.replace(
      save_location.temp,
      save_location.approved,
    );

    try {
      const approveAssets = await bucket
        .file(assetUrl)
        .copy(bucket.file(newUrl));
      const approveAssetsThumbnail = await bucket
        .file(assetThumbnail)
        .copy(bucket.file(newThumbnail));
      const update = await CampaignAsset.where("id", assetId).update({
        img_url: {
          url: `https://storage.googleapis.com/${BUCKET_NAME}/${newUrl}`,
          thumbnail: `https://storage.googleapis.com/${BUCKET_NAME}/${newThumbnail}`,
        },
        status: "approved",
        storage_location: "approved",
        approved_at: new Date().toISOString(),
        approved_by: userId,
      });

      const clearTemp = await bucket.file(assetUrl).delete();
      const clearTempThumbnail = await bucket.file(assetThumbnail).delete();
    } catch (err) {
      throw new Error(err);
    }
  }

  async rejectAsset(assetId, userId, reason) {
    const asset = await CampaignAsset.where("id", assetId).get();

    if (asset.status !== "draft") {
      throw new Error("Asset is not in draft status");
    }
    const rejctAsset = await CampaignAsset.where("id", assetId).update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejected_by: userId,
      rejected_reason: reason,
    });
  }

  /**
   * Retrieves assets by IDs and converts them to Gemini inlineData parts.
   * Useful for refinement/fusion.
   * @param {string[]} assetIds
   * @returns {Promise<{parts: Object[], campaignId: string}>}
   */
  async fetchAssetsAsGeminiParts(assetIds) {
    const parts = [];
    let campaignId = null;

    for (const id of assetIds) {
      const assets = await CampaignAsset.where("id", id).get();
      const assetObj = assets && assets.length > 0 ? assets[0] : null;

      if (!assetObj) {
        console.warn(`[ImageStorage] Asset ID ${id} no encontrado.`);
        continue;
      }

      // Capturamos el campaignId del primer asset válido
      if (!campaignId) campaignId = assetObj.campaign_assets;

      let imgUrl = assetObj.img_url;
      if (typeof imgUrl === "object" && imgUrl.url) imgUrl = imgUrl.url;

      try {
        const responseImg = await axios.get(imgUrl, {
          responseType: "arraybuffer",
        });
        const base64Image = Buffer.from(responseImg.data).toString("base64");
        const mimeType = imgUrl.endsWith("png") ? "image/png" : "image/jpeg";

        parts.push({
          inlineData: { mimeType, data: base64Image },
        });
      } catch (err) {
        console.warn(
          `[ImageStorage] Error descargando asset ${id}: ${err.message}`,
        );
      }
    }

    return { parts, campaignId };
  }
  /**
   * Deletes an asset and its children recursively from DB and Storage.
   * @param {string} assetId
   */
  async deleteAssetRecursive(assetId) {
    // 1. Encontrar el asset principal y sus hijos
    // Buscamos: el asset con id = assetId O parent_asset_id = assetId
    const parentAsset = await CampaignAsset.where("id", assetId).get();
    if (!parentAsset || parentAsset.length === 0) {
      throw new Error("Asset no encontrado");
    }

    // Hijos
    const children = await CampaignAsset.where(
      "parent_asset_id",
      assetId,
    ).get();

    // Unificar lista para iterar
    const allAssets = [...parentAsset, ...children];

    const deletedIds = [];
    const errors = [];

    for (const asset of allAssets) {
      try {
        // 2. Eliminar de GCS
        // img_url puede ser string o objeto en tu modelo, según el código de arriba parece objeto { url, thumbnail }
        // Aseguramos estructura
        let urlsToDelete = [];

        if (asset.img_url) {
          if (typeof asset.img_url === "object") {
            if (asset.img_url.url) urlsToDelete.push(asset.img_url.url);
            if (asset.img_url.thumbnail)
              urlsToDelete.push(asset.img_url.thumbnail);
          } else if (typeof asset.img_url === "string") {
            urlsToDelete.push(asset.img_url);
          }
        }

        // Patrón para extraer el path relativo del bucket
        // Ejemplo: https://storage.googleapis.com/BUCKET_NAME/path/to/file.png
        // Queremos: path/to/file.png

        for (const publicUrl of urlsToDelete) {
          if (!publicUrl.includes("storage.googleapis.com")) continue;

          // Simple split para sacar el path relativo después del bucket
          // url: https://storage.googleapis.com/creativa-campaign-assets/temp/campId/file.png
          // split by bucket name
          const parts = publicUrl.split(`${BUCKET_NAME}/`);
          if (parts.length > 1) {
            const filePath = parts[1]; // temp/campId/file.png
            try {
              await bucket.file(filePath).delete();
            } catch (gcsErr) {
              console.warn(
                `[ImageStorage] No se pudo borrar archivo GCS ${filePath}: ${gcsErr.message}`,
              );
              // No lanzamos error fatal, seguimos con el registro de DB
            }
          }
        }

        // 3. Eliminar de DB
        await CampaignAsset.where("id", asset.id).delete();
        deletedIds.push(asset.id);
      } catch (err) {
        console.error(
          `[ImageStorage] Error eliminando asset ${asset.id}: ${err.message}`,
        );
        errors.push({ id: asset.id, error: err.message });
      }
    }

    return { deletedIds, errors };
  }
}

export default new ImageStorageService();
