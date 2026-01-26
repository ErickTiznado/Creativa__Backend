import { Storage } from "@google-cloud/storage";
import { PredictionServiceClient, helpers } from "@google-cloud/aiplatform";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import axios from "axios";
import CampaignAsset from "../model/CampaignAsset.js";

// --- CONFIGURACIÓN ---
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || "creativa-campaign-assets";
const bucket = storage.bucket(bucketName);

// Configura esto en tu .env o ponlo directo aquí para probar
const PROJECT_ID = process.env.GCP_PROJECT_ID || "ugb-creativamkt-484123";
const LOCATION = "us-central1"; // Imagen suele estar aquí
const PUBLISHER = "google";
const MODEL = "imagegeneration@006"; // Modelo Imagen 2

// Cliente de Vertex AI
const predictionServiceClient = new PredictionServiceClient({
    apiEndpoint: `${LOCATION}-aiplatform.googleapis.com`,
});

// --- HELPER PRIVADO: Procesa, sube y guarda ---
// Esto evita repetir código entre saveToStorage y refineAsset
async function _processAndSaveImage({ buffer, campaignId, prompt, parentAssetId = null }) {
    // Detectar tipo
    const metadata = await sharp(buffer).metadata();
    const isJpg = metadata.format === 'jpeg' || metadata.format === 'jpg';
    const contentType = isJpg ? 'image/jpeg' : 'image/png';
    const ext = isJpg ? 'jpeg' : 'png';

    const fileUuid = uuidv4();
    const timestamp = Date.now();

    // Rutas GCS
    const fileNameOriginal = `campaigns/${campaignId}/${fileUuid}_${timestamp}.${ext}`;
    const fileNameThumb = `campaigns/${campaignId}/${fileUuid}_${timestamp}_thumb.${ext}`;

    // Generar Thumbnail
    const thumbBuffer = await sharp(buffer)
        .resize(300)
        .toFormat(ext, { quality: 80 })
        .toBuffer();

    // Subir a GCS
    const fileOriginal = bucket.file(fileNameOriginal);
    const fileThumb = bucket.file(fileNameThumb);

    const uploadOptions = {
        metadata: { contentType },
        contentType,
        resumable: false
    };

    await Promise.all([
        fileOriginal.save(buffer, uploadOptions),
        fileThumb.save(thumbBuffer, uploadOptions)
    ]);

    const urlOriginal = `https://storage.googleapis.com/${bucketName}/${fileNameOriginal}`;
    const urlThumb = `https://storage.googleapis.com/${bucketName}/${fileNameThumb}`;

    // Guardar en BD
    const assetJson = { url: urlOriginal, thumbnail: urlThumb };

    const assetData = {
        campaign_assets: campaignId, // FK
        img_url: assetJson,
        prompt_used: prompt || "",
        is_approved: true,
        parent_asset_id: parentAssetId // Nuevo campo
    };

    const newAsset = await CampaignAsset.create(assetData);

    return { ...assetData, id: newAsset?.id };
}


// --- ENDPOINT 1: GUARDADO NORMAL (TAREA 3) ---
export const saveToStorage = async (req, res) => {
    try {
        const { campaignId, prompt } = req.body;
        const filesInput = req.files?.images;

        if (!campaignId || !filesInput) {
            res.statusCode = 400;
            return res.json({ error: "Faltan datos requeridos" });
        }

        const filesArray = Array.isArray(filesInput) ? filesInput : [filesInput];

        const uploadPromises = filesArray.map(async (file) => {
            if (!file.data) throw new Error("Archivo vacío");

            // Usamos el helper
            return await _processAndSaveImage({
                buffer: file.data,
                campaignId,
                prompt
            });
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


// --- ENDPOINT 2: INPAINTING / REFINAMIENTO (TAREA 4) ---
export const refineAsset = async (req, res) => {
    try {
        // Recibimos JSON porque la máscara suele venir en Base64 desde el canvas del front
        const { assetId, mask, refinementPrompt } = req.body;

        if (!assetId || !mask || !refinementPrompt) {
            res.statusCode = 400;
            return res.json({ error: "Faltan datos: assetId, mask o refinementPrompt" });
        }

        // 1. Obtener la imagen original de la BD
        // OJO: Dynamo.Model.find suele buscar por ID. Ajusta si tu ORM usa otro método.
        // Si assetId es UUID, asegúrate que CampaignAsset lo soporte.
        // Aquí simulamos una búsqueda manual si .find(id) no está disponible directo:
        const assets = await CampaignAsset.where("id", assetId).get();
        const originalAsset = assets[0];

        if (!originalAsset) {
            res.statusCode = 404;
            return res.json({ error: "Imagen base no encontrada" });
        }

        const originalUrl = originalAsset.img_url?.url;
        const campaignId = originalAsset.campaign_assets; // Recuperamos la campaña original

        if (!originalUrl) {
            res.statusCode = 404;
            return res.json({ error: "URL de imagen base inválida" });
        }

        // 2. Descargar la imagen original como Buffer
        const responseImg = await axios.get(originalUrl, { responseType: 'arraybuffer' });
        const baseImageBuffer = Buffer.from(responseImg.data);

        // 3. Preparar la Máscara (viene en Base64 string)
        // Limpiamos el header si viene "data:image/png;base64,..."
        const cleanMask = mask.replace(/^data:image\/\w+;base64,/, "");
        const maskBuffer = Buffer.from(cleanMask, 'base64');

        // Validar que la máscara sea PNG (Vertex lo prefiere)
        const finalMaskBuffer = await sharp(maskBuffer).toFormat('png').toBuffer();
        const finalBaseImageBuffer = await sharp(baseImageBuffer).toFormat('png').toBuffer();

        // 4. Construir Payload para Vertex AI (Imagen 2)
        // Documentation: https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/image-generation
        const endpoint = `projects/${PROJECT_ID}/locations/${LOCATION}/publishers/${PUBLISHER}/models/${MODEL}`;

        const promptObj = {
            prompt: refinementPrompt,
        };

        // Convertimos a base64 para enviar a la API de Google
        const imageBase64 = finalBaseImageBuffer.toString('base64');
        const maskBase64 = finalMaskBuffer.toString('base64');

        const instance = helpers.toValue({
            prompt: refinementPrompt,
            image: { bytesBase64Encoded: imageBase64 },
            mask: {
                image: { bytesBase64Encoded: maskBase64 }
                // Vertex a veces requiere 'maskMode'. Default suele ser editar lo blanco.
            }
        });

        const parameters = helpers.toValue({
            sampleCount: 1,
            // seed: 1, // Opcional para determinismo
            editConfig: {
                editMode: "inpainting-insert", // o 'inpainting-remove'
            }
        });

        // 5. Llamar a Vertex AI
        // NOTA: Si esto falla por permisos, asegúrate de habilitar "Vertex AI API" en Google Cloud
        const [response] = await predictionServiceClient.predict({
            endpoint,
            instances: [instance],
            parameters,
        });

        if (!response.predictions || response.predictions.length === 0) {
            throw new Error("Vertex AI no retornó ninguna imagen.");
        }

        // 6. Procesar respuesta
        const prediction = response.predictions[0];
        const bytesBase64Encoded = prediction.structValue.fields.bytesBase64Encoded.stringValue;
        const resultBuffer = Buffer.from(bytesBase64Encoded, 'base64');

        // 7. Guardar la nueva versión usando el helper
        const savedAsset = await _processAndSaveImage({
            buffer: resultBuffer,
            campaignId: campaignId,
            prompt: refinementPrompt,
            parentAssetId: assetId // Trazabilidad
        });

        res.statusCode = 200;
        res.json({
            success: true,
            message: "Imagen refinada exitosamente",
            data: savedAsset
        });

    } catch (error) {
        console.error("Error refineAsset:", error);
        res.statusCode = 500;
        res.json({ error: error.message || "Error en el proceso de inpainting" });
    }
};