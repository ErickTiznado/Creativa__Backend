import sharp from 'sharp';

class SharpImageAdapter {
    async applyBrandWatermarkDynamic(baseImageBuffer, logoBufferWhite, logoBufferRed) {
        try {
            // Usamos el buffer limpio para obtener medidas de la imagen base
            const baseImage = sharp(baseImageBuffer);
            const baseMetadata = await baseImage.metadata();
            const baseWidth = baseMetadata.width;

            // --- 1. REDIMENSIONAR EL LOGO ---
            // El logo será el 15% del ancho de la imagen original
            const targetLogoWidth = Math.round(baseWidth * 0.15);

            // ⚠️ FIX DE TRANSPARENCIA: Usamos .ensureAlpha() y .png() para garantizar el fondo transparente
            const resizedWhiteLogo = await sharp(logoBufferWhite)
                .ensureAlpha()
                .resize({ width: targetLogoWidth })
                .png()
                .toBuffer();

            const resizedRedLogo = await sharp(logoBufferRed)
                .ensureAlpha()
                .resize({ width: targetLogoWidth })
                .png()
                .toBuffer();

            const logoMetadata = await sharp(resizedWhiteLogo).metadata();
            const logoHeight = logoMetadata.height;

            // --- 2. CALCULAR ZONA DE PROTECCIÓN (MARGIN) ---
            // Un margen del 10% de la altura del logo se ve bien según tus referencias
            const padding = Math.round(logoHeight * 0.1);
            const top = padding;
            const left = padding;

            // --- 3. DETECTAR CONTRASTE DE LA ESQUINA ---
            // Extraemos la región de la esquina de la imagen ORIGINAL para analizar el brillo
            const cornerRegion = await baseImage
                .clone() // Importante: clonar para no afectar la imagen principal
                .extract({ left: 0, top: 0, width: targetLogoWidth + padding * 2, height: logoHeight + padding * 2 })
                .toBuffer();

            const stats = await sharp(cornerRegion).stats();
            // Luminancia promedio (aprox)
            const brightness = stats.channels[0].mean;

            // Si es oscuro (<128) va blanco, si es claro (>=128) va rojo
            const logoToUse = brightness < 128 ? resizedWhiteLogo : resizedRedLogo;

            console.log(`Brillo promedio de la esquina: ${brightness.toFixed(2)} | Logo seleccionado: ${brightness < 128 ? 'BLANCO' : 'ROJO'}`);

            // --- 4. COMPONER LA IMAGEN FINAL ---
            // Pegamos el logo redimensionado y transparente sobre la imagen base
            const finalImageBuffer = await baseImage
                .composite([
                    {
                        input: logoToUse,
                        top: top,
                        left: left,
                        // 'over' es el modo estándar para transparencias
                        blend: 'over'
                    }
                ])
                .toBuffer();

            return finalImageBuffer;

        } catch (error) {
            console.error('[SharpImageAdapter] Error aplicando marca de agua dinámica:', error);
            throw new Error('Fallo al insertar el logo dinámico en la imagen');
        }
    }
}

export default SharpImageAdapter;