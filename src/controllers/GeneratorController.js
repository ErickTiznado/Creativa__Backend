import { Storage } from "@google-cloud/storage";
import { v4 as uuidv4 } from "uuid";
import sharp from "sharp";
import CampaignAsset from "../model/CampaignAsset.js";

// Configuración de GCS
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME || "creativa-campaign-assets";
const bucket = storage.bucket(bucketName);

export const saveToStorage = async (req, res) => {
    try {
        // 1. LEER CAMPOS DE TEXTO (req.body)
        const { campaignId, prompt } = req.body;

        // 2. LEER ARCHIVOS (req.files)
        // Nota: Ajusta si en tu Postman usas "image" (singular) o "images" (plural).
        // Aquí lo dejé como "images" según tu último código enviado.
        const filesInput = req.files?.images;

        if (!campaignId || !filesInput) {
            res.statusCode = 400;
            return res.json({ error: "Faltan datos: campaignId o el archivo 'images'" });
        }

        const filesArray = Array.isArray(filesInput) ? filesInput : [filesInput];

        const uploadPromises = filesArray.map(async (file) => {
            // 3. OBTENER BUFFER DIRECTO
            const buffer = file.data;

            if (!buffer) {
                throw new Error(`El archivo ${file.filename} no tiene contenido.`);
            }

            // --- CORRECCIÓN DE TIPO MIME ---
            // Forzamos la detección por extensión para evitar "application/octet-stream"
            const originalName = file.filename || "imagen.png";
            const isJpg = originalName.match(/\.(jpg|jpeg)$/i);

            const contentType = isJpg ? 'image/jpeg' : 'image/png';
            const ext = isJpg ? 'jpeg' : 'png';
            // -------------------------------

            const fileUuid = uuidv4();
            const timestamp = Date.now();

            // Rutas GCS
            const fileNameOriginal = `campaigns/${campaignId}/${fileUuid}_${timestamp}.${ext}`;
            const fileNameThumb = `campaigns/${campaignId}/${fileUuid}_${timestamp}_thumb.${ext}`;

            // 4. Generar Thumbnail (Sharp)
            const thumbBuffer = await sharp(buffer)
                .resize(300)
                .toFormat(ext, { quality: 80 }) // Usamos el formato detectado
                .toBuffer();

            // 5. Subir a GCS
            const fileOriginal = bucket.file(fileNameOriginal);
            const fileThumb = bucket.file(fileNameThumb);

            // Opciones explícitas para GCS
            const uploadOptions = {
                metadata: { contentType: contentType },
                contentType: contentType,
                resumable: false
            };

            await Promise.all([
                fileOriginal.save(buffer, uploadOptions),
                fileThumb.save(thumbBuffer, uploadOptions)
            ]);

            const urlOriginal = `https://storage.googleapis.com/${bucketName}/${fileNameOriginal}`;
            const urlThumb = `https://storage.googleapis.com/${bucketName}/${fileNameThumb}`;

            // 6. Guardar en BD (Tu esquema Supabase)
            const assetJson = {
                url: urlOriginal,
                thumbnail: urlThumb
            };

            const assetData = {
                campaign_assets: campaignId, // Tu FK
                img_url: assetJson,
                prompt_used: prompt || "",   // Texto del form-data
                is_approved: true
            };

            const newAsset = await CampaignAsset.create(assetData);

            return {
                ...assetData,
                id: newAsset?.id
            };
        });

        const results = await Promise.all(uploadPromises);

        res.statusCode = 201;
        res.json({
            success: true,
            message: "Archivos procesados correctamente",
            data: results
        });

    } catch (error) {
        console.error("Error saveToStorage:", error);
        res.statusCode = 500;
        res.json({ error: error.message || "Error interno procesando archivos" });
    }
};