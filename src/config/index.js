import { Storage } from "@google-cloud/storage";
import { VertexAI } from "@google-cloud/vertexai";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import axios from "axios";
import path from "path";
import { fileURLToPath } from "url";
import CampaignAsset from "../model/CampaignAsset.js";

// --- 1. CONFIGURACIÓN DE RUTAS Y LLAVE ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KEY_PATH = path.join(__dirname, "../../config/key/creativa-key.json");

// --- 2. CONFIGURACIÓN DEL PROYECTO ---
const PROJECT_ID = process.env.GCP_PROJECT_ID || "ugb-creativamkt";
const LOCATION = "us-central1";

// EL MODELO SECRETO DE ERICK
const MODEL = 'gemini-2.5-flash-image';

// --- 3. INICIALIZAR CLIENTES ---

// A. Storage (Google Drive)
const storage = new Storage({
  keyFilename: KEY_PATH,
  projectId: PROJECT_ID
});
const bucketName = process.env.GCS_BUCKET_NAME || "creativa-campaign-assets";
const bucket = storage.bucket(bucketName);

// B. Vertex AI (Inteligencia Artificial)
const vertexAI = new VertexAI({
  project: PROJECT_ID,
  location: LOCATION,
  googleAuthOptions: { keyFile: KEY_PATH } // Mantenemos tu auth manual que ya funcionó
});

// INSTANCIAR MODELO CON LA CONFIGURACIÓN DE ERICK
// Usamos .preview y responseModalities para forzar imagen
const generativeModel = vertexAI.preview.getGenerativeModel({
  model: MODEL,
  generationConfig: {
    maxOutputTokens: 2048,
    temperature: 0.1,
    responseModalities: ['IMAGE', 'TEXT'] // <--- LA CLAVE MÁGICA
  },
});

// --- HELPER PRIVADO (Guardado en DB y Storage) ---
async function _processAndSaveImage({ buffer, campaignId, prompt, parentAssetId = null }) {
  const metadata = await sharp(buffer).metadata();
  const isJpg = metadata.format === 'jpeg' || metadata.format === 'jpg';
  const contentType = isJpg ? 'image/jpeg' : 'image/png';
  const ext = isJpg ? 'jpeg' : 'png';

  const fileUuid = uuidv4();
  const timestamp = Date.now();

  const fileNameOriginal = `campaigns/${campaignId}/${fileUuid}_${timestamp}.${ext}`;
  const fileNameThumb = `campaigns/${campaignId}/${fileUuid}_${timestamp}_thumb.${ext}`;

  const thumbBuffer = await sharp(buffer)
    .resize(300)
    .toFormat(ext, { quality: 80 })
    .toBuffer();

  const fileOriginal = bucket.file(fileNameOriginal);
  const fileThumb = bucket.file(fileNameThumb);

  const uploadOptions = { metadata: { contentType }, contentType, resumable: false };

  await Promise.all([
    fileOriginal.save(buffer, uploadOptions),
    fileThumb.save(thumbBuffer, uploadOptions)
  ]);

  const urlOriginal = `https://storage.googleapis.com/${bucketName}/${fileNameOriginal}`;
  const urlThumb = `https://storage.googleapis.com/${bucketName}/${fileNameThumb}`;

  const assetJson = { url: urlOriginal, thumbnail: urlThumb };

  const assetData = {
    campaign_assets: campaignId,
    img_url: assetJson,
    prompt_used: prompt || "",
    is_approved: true,
    parent_asset_id: parentAssetId
  };

  const newAsset = await CampaignAsset.create(assetData);
  return { ...assetData, id: newAsset?.id };
}

// --- ENDPOINT 1: SAVE (Subida normal) ---
export const saveToStorage = async (req, res) => {
  try {
    const { campaignId, prompt } = req.body;
    const filesInput = req.files?.images || req.files?.image;

    if (!campaignId || !filesInput) {
      res.statusCode = 400;
      return res.json({ error: "Faltan datos requeridos" });
    }
    const filesArray = Array.isArray(filesInput) ? filesInput : [filesInput];
    const uploadPromises = filesArray.map(async (file) => {
      if (!file.data) throw new Error("Archivo vacío");
      return await _processAndSaveImage({ buffer: file.data, campaignId, prompt });
    });
    const results = await Promise.all(uploadPromises);
    res.statusCode = 201;
    res.json({ success: true, data: results });
  } catch (error) {
    console.error("Error saveToStorage:", error);
    res.statusCode = 500;
    res.json({ error: error.message });
  }
};

// --- ENDPOINT 2: REFINAMIENTO (Fusión Código Erick + Tu Backend) ---
export const refineAsset = async (req, res) => {
  try {
    const { assetId, refinementPrompt } = req.body;

    if (!assetId || !refinementPrompt) {
      res.statusCode = 400;
      return res.json({ error: "Faltan datos: assetId o refinementPrompt" });
    }

    // 1. Obtener imagen base de tu DB
    const assets = await CampaignAsset.where("id", assetId).get();
    const originalAsset = assets && assets.length > 0 ? assets[0] : null;

    if (!originalAsset) {
      res.statusCode = 404;
      return res.json({ error: "Imagen base no encontrada" });
    }

    let originalUrl = originalAsset.img_url;
    if (typeof originalUrl === 'object' && originalUrl.url) originalUrl = originalUrl.url;
    const campaignId = originalAsset.campaign_assets;

    // 2. Descargar imagen (Para enviársela a Gemini como referencia)
    const responseImg = await axios.get(originalUrl, { responseType: 'arraybuffer' });
    const baseImageBuffer = Buffer.from(responseImg.data);
    const base64Image = baseImageBuffer.toString('base64');
    const mimeType = originalUrl.endsWith('png') ? 'image/png' : 'image/jpeg';

    // 3. Preparar el Payload al estilo de Erick
    const reqContent = {
      contents: [{
        role: 'user',
        parts: [
          { text: refinementPrompt }, // El prompt del usuario
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Image
            }
          } // La imagen original como referencia
        ]
      }]
    };

    console.log(`Enviando a Gemini (${MODEL}) con responseModalities=['IMAGE']...`);

    // 4. Generar
    const result = await generativeModel.generateContent(reqContent);
    const response = await result.response;

    // 5. Extraer la Imagen (Lógica de Erick)
    // Buscamos la parte que tenga 'inlineData' (la imagen generada)
    const candidate = response.candidates[0];
    const imageData = candidate.content.parts.find(part => part.inlineData);

    // Recolectar texto por si acaso
    let textResponse = "";
    candidate.content.parts.forEach(part => {
      if (part.text) textResponse += part.text;
    });

    if (imageData) {
      console.log("¡Éxito! Imagen recibida de Gemini. Guardando...");

      // Convertir de Base64 a Buffer
      const resultBuffer = Buffer.from(imageData.inlineData.data, 'base64');

      // 6. Guardar usando TU sistema (DB + Storage)
      const savedAsset = await _processAndSaveImage({
        buffer: resultBuffer,
        campaignId: campaignId,
        prompt: refinementPrompt,
        parentAssetId: assetId
      });

      res.statusCode = 200;
      res.json({
        success: true,
        message: "Imagen generada correctamente por Gemini",
        data: savedAsset,
        text_comment: textResponse // A veces Gemini añade comentarios
      });

    } else {
      // Si Gemini decidió no hacer imagen y solo hablar
      console.warn("Gemini devolvió solo texto:", textResponse);
      res.json({
        success: false,
        type: "text_only",
        message: "Gemini respondió solo texto (no se generó imagen)",
        response: textResponse
      });
    }

  } catch (error) {
    console.error("Error refineAsset:", error);
    res.statusCode = 500;
    res.json({ error: error.message || "Error en generación con Gemini" });
  }
};