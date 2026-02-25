import sharp from 'sharp';

class SharpImageAdapter {
    #logoBufferWhite;
    #logoBufferRed;

    constructor(logoBufferWhite, logoBufferRed) {
        this.#logoBufferWhite = logoBufferWhite;
        this.#logoBufferRed = logoBufferRed;
    }

    async applyBrandWatermarkDynamic(baseImageBuffer) {
        try {
            const baseImage = sharp(baseImageBuffer);
            const baseMetadata = await baseImage.metadata();
            const baseWidth = baseMetadata.width;

            // El logo será el 15% del ancho de la imagen original
            const targetLogoWidth = Math.round(baseWidth * 0.15);

            const resizedWhiteLogo = await sharp(this.#logoBufferWhite)
                .ensureAlpha()
                .resize({ width: targetLogoWidth })
                .png()
                .toBuffer();

            const resizedRedLogo = await sharp(this.#logoBufferRed)
                .ensureAlpha()
                .resize({ width: targetLogoWidth })
                .png()
                .toBuffer();

            const logoMetadata = await sharp(resizedWhiteLogo).metadata();
            const logoHeight = logoMetadata.height;

            const padding = Math.round(logoHeight * 0.1);
            const top = padding;
            const left = padding;

            const cornerRegion = await baseImage
                .clone()
                .extract({ left: 0, top: 0, width: targetLogoWidth + padding * 2, height: logoHeight + padding * 2 })
                .toBuffer();

            const stats = await sharp(cornerRegion).stats();
            const brightness = stats.channels[0].mean;

            const logoToUse = brightness < 128 ? resizedWhiteLogo : resizedRedLogo;

            console.log(`Brillo promedio de la esquina: ${brightness.toFixed(2)} | Logo seleccionado: ${brightness < 128 ? 'BLANCO' : 'ROJO'}`);

            const finalImageBuffer = await baseImage
                .composite([{ input: logoToUse, top, left, blend: 'over' }])
                .toBuffer();

            return finalImageBuffer;

        } catch (error) {
            console.error('[SharpImageAdapter] Error aplicando marca de agua dinámica:', error);
            throw new Error('Fallo al insertar el logo dinámico en la imagen');
        }
    }
}

export default SharpImageAdapter;
