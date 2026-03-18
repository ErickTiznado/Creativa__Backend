import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

class SharpImageAdapter {
    #referencesPath;

    constructor(referencesPath) {
        this.#referencesPath = referencesPath;
    }

    async applyBrandWatermarkDynamic(baseImageBuffer, logoType, resolution) {
        try {
            // 1. Condición para logo opcional
            if (!logoType || logoType === 'Ninguno') {
                console.log('Logo opcional seleccionado: Ninguno. Retornando imagen limpia.');
                return baseImageBuffer;
            }

            const baseImage = sharp(baseImageBuffer);
            const baseMetadata = await baseImage.metadata();
            const baseWidth = baseMetadata.width;
            const baseHeight = baseMetadata.height;

            // 2. Lógica para escalar el logo (TAMAÑOS AUMENTADOS)
            let scaleFactor = 0.25; // 25% del ancho por defecto para 1080x1080 o similares
            if (baseHeight > baseWidth) {
                 // Si es vertical (ej. 1080x1920), el logo necesita más presencia relativa al ancho. Subimos al 32%.
                 scaleFactor = 0.32; 
            }
            
            const targetLogoWidth = Math.round(baseWidth * scaleFactor);

            // 3. Preparar las rutas de los logos dependiendo de la marca
            let darkLogoPath, lightLogoPath;

            if (logoType === 'Creativa') {
                darkLogoPath = path.join(this.#referencesPath, 'logo_creativa_red.png'); 
                lightLogoPath = path.join(this.#referencesPath, 'logo_creativa_white.png'); 
            } else if (logoType === 'Visible') {
                darkLogoPath = path.join(this.#referencesPath, 'logo_visible_black.png'); 
                lightLogoPath = path.join(this.#referencesPath, 'logo_visible_white.png'); 
            } else {
                 console.warn(`Tipo de logo desconocido: ${logoType}. Se retornará la imagen limpia.`);
                 return baseImageBuffer;
            }

            // Validar que los archivos existan
            if (!fs.existsSync(darkLogoPath) || !fs.existsSync(lightLogoPath)) {
                throw new Error(`Faltan los archivos de logo para la marca ${logoType} en la carpeta references.`);
            }

            // Leer los buffers de ambos logos
            const logoBufferDark = fs.readFileSync(darkLogoPath);
            const logoBufferLight = fs.readFileSync(lightLogoPath);

            // Redimensionar ambos logos al ancho objetivo
            const resizedLightLogo = await sharp(logoBufferLight)
                .ensureAlpha()
                .resize({ width: targetLogoWidth })
                .png()
                .toBuffer();

            const resizedDarkLogo = await sharp(logoBufferDark)
                .ensureAlpha()
                .resize({ width: targetLogoWidth })
                .png()
                .toBuffer();

            // 4. Lógica de cálculo de brillo estandarizada para ambas marcas
            const logoMetadata = await sharp(resizedLightLogo).metadata();
            const logoHeight = logoMetadata.height;
            const padding = Math.round(logoHeight * 0.1);
            
            // Extraer la esquina superior izquierda para medir el brillo
            const cornerRegion = await baseImage
                .clone()
                .extract({ left: 0, top: 0, width: targetLogoWidth + padding * 2, height: logoHeight + padding * 2 })
                .toBuffer();

            const stats = await sharp(cornerRegion).stats();
            const brightness = stats.channels[0].mean;

            // Elegir el logo según el contraste (Si el brillo es < 128 (oscuro), usamos el claro. Si no, usamos el oscuro)
            const finalLogoBuffer = brightness < 128 ? resizedLightLogo : resizedDarkLogo;
            const chosenColor = brightness < 128 ? 'CLARO/BLANCO' : 'OSCURO/COLOR';
            
            console.log(`[${logoType}] Brillo de la esquina: ${brightness.toFixed(2)} | Logo seleccionado: ${chosenColor}`);

            // 5. Pegar el logo seleccionado en la imagen final
            const logoFinalMetadata = await sharp(finalLogoBuffer).metadata();
            const finalPadding = Math.round(logoFinalMetadata.height * 0.1);
            const top = finalPadding;
            const left = finalPadding;

            const finalImageBuffer = await baseImage
                .composite([{ input: finalLogoBuffer, top, left, blend: 'over' }])
                .toBuffer();

            return finalImageBuffer;

        } catch (error) {
            console.error('[SharpImageAdapter] Error aplicando marca de agua dinámica:', error);
            throw new Error(`Fallo al insertar el logo dinámico en la imagen: ${error.message}`);
        }
    }
    /**
     * Redimensiona un buffer de imagen a las dimensiones reales del string de resolución.
     * El ANCHO se deriva de la resolución elegida y el ALTO del aspect ratio.
     * Esto permite que resolución y aspect ratio sean completamente independientes.
     *
     * @param {Buffer} imageBuffer - Buffer de la imagen generada por Gemini
     * @param {string} resolution  - Ej: '1080x1080', '1080x1920', '2K', '4K'
     * @param {string} aspectRatio - Ej: '1:1', '9:16', '16:9'
     * @returns {Promise<Buffer>} Buffer redimensionado
     */
    async resizeToResolution(imageBuffer, resolution, aspectRatio = '1:1') {
        // Mapa: string de resolución → ancho base en píxeles
        const BASE_WIDTH_MAP = {
            '1080x1080':  1080,
            '1080x1920':  1080,
            '1920x1080':  1920,
            '2K':         2048,
            '4K':         4096,
        };

        // Relaciones de aspecto soportadas [partes_ancho, partes_alto]
        const ASPECT_RATIOS = {
            '1:1':  [1, 1],
            '9:16': [9, 16],
            '16:9': [16, 9],
            '4:5':  [4, 5],
            '5:4':  [5, 4],
            '3:4':  [3, 4],
            '4:3':  [4, 3],
            '3:2':  [3, 2],
            '2:3':  [2, 3],
        };

        const upperRes = String(resolution).toUpperCase();
        const lookupKey = BASE_WIDTH_MAP[resolution] ? resolution : upperRes;
        const baseWidth = BASE_WIDTH_MAP[lookupKey] || BASE_WIDTH_MAP[resolution];

        if (!baseWidth) {
            console.warn(`[SharpImageAdapter] Resolución desconocida: ${resolution}. Sin redimensionar.`);
            return imageBuffer;
        }

        const [rw, rh] = ASPECT_RATIOS[aspectRatio] || [1, 1];
        const targetWidth  = baseWidth;
        const targetHeight = Math.round(baseWidth * rh / rw);

        console.log(`[SharpImageAdapter] Redimensionando a ${targetWidth}x${targetHeight} (res: ${resolution}, ratio: ${aspectRatio})`);

        return sharp(imageBuffer)
            .resize(targetWidth, targetHeight, {
                fit: 'fill',        // Llena las dimensiones exactas
                kernel: 'lanczos3', // Máxima calidad de escalado
            })
            .png({ compressionLevel: 0, effort: 1 }) // PNG sin comprimir = máx calidad
            .toBuffer();
    }
}

export default SharpImageAdapter;