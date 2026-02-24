class ImageGeneratorRequest {
  constructor({ prompt, numberOfImages, config, brandId, campaignId, style, methodToUse }) {
    if (!prompt) {
      throw new Error("El prompt es requerido para generar la imagen.");
    }

    this.prompt = prompt;
    this.numberOfImages = numberOfImages || 1;
    this.config = config || {};
    this.brandId = brandId;
    this.campaignId = campaignId;
    this.style = style;

    // Lo guardamos en la entidad. Si viene vacío, por defecto es 'sharp'
    this.methodToUse = methodToUse || 'sharp';
  }
}

export default ImageGeneratorRequest;